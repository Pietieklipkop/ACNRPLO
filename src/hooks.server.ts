import type { Handle } from '@sveltejs/kit';
import { building } from '$app/environment';
import { redirect, error } from '@sveltejs/kit';
import { createAuth } from '$lib/server/auth';
import { ensureSeedData } from '$lib/server/db/seed';
import { getDb, schema } from '$lib/server/db';
import { eq, and } from 'drizzle-orm';
import type { UserRole } from '$lib/server/auth/roles';
import { hasAnyRole } from '$lib/server/auth/roles';

export const handle: Handle = async ({ event, resolve }) => {
	if (building || !event.platform?.env?.DB) {
		return resolve(event);
	}

	const { DB } = event.platform.env;
	const auth = createAuth(DB, event.url.origin);
	event.locals.auth = auth;

	// Ensure seed accounts for each role and reserve entities exist on boot
	await ensureSeedData(auth, DB);

	try {
		const sessionData = await auth.api.getSession({
			headers: event.request.headers
		});

		if (sessionData?.user) {
			const db = getDb(DB);
			const fullUser = await db.query.user.findFirst({
				where: eq(schema.user.id, sessionData.user.id)
			});

			if (fullUser && fullUser.status !== 'disabled' && fullUser.status !== 'archived') {
				let parsedRoles: UserRole[] = ['main_plo'];
				try {
					parsedRoles = JSON.parse(fullUser.roles || '["main_plo"]');
				} catch {
					parsedRoles = ['main_plo'];
				}

				// Fetch user's land portions to compute active ownership and voting power
				const portions = await db.query.landPortions.findMany({
					where: eq(schema.landPortions.userId, fullUser.id)
				});

				let totalBps = portions
					.filter((p) => p.status === 'active')
					.reduce((sum, p) => sum + (p.ownershipBps ?? 0), 0);

				let totalVoteBps = portions
					.filter((p) => p.status === 'active')
					.reduce((sum, p) => sum + (p.voteAllocationBps ?? p.ownershipBps ?? 0), 0);

				let associateRelationship: 'family' | 'co_owner' | 'delegate' | null = null;
				let sponsoringMainPloUserId: string | null = null;
				let sponsorName: string | null = null;

				if (parsedRoles.includes('associate')) {
					const assoc = await db.query.associates.findFirst({
						where: eq(schema.associates.associateUserId, fullUser.id),
						with: {
							sponsorUser: true
						}
					});

					// If an associate record was deleted/removed by the Main PLO, deny active session
					if (!assoc) {
						event.locals.session = null;
						event.locals.user = null;
						return resolve(event);
					}

					associateRelationship = (assoc.relationship as 'family' | 'co_owner' | 'delegate') || 'family';
					sponsoringMainPloUserId = assoc.sponsoringMainPloUserId;
					sponsorName = assoc.sponsorUser?.name || 'Main PLO Member';

					// Fetch sponsor's portions to inherit voting weight (for Delegate) or ownership percentage (for Co-Owner)
					const sponsorPortions = await db.query.landPortions.findMany({
						where: and(
							eq(schema.landPortions.userId, assoc.sponsoringMainPloUserId),
							eq(schema.landPortions.status, 'active')
						)
					});
					const sponsorOwnershipBps = sponsorPortions.reduce((sum, p) => sum + (p.ownershipBps ?? 0), 0);
					const sponsorVoteAllocationBps = sponsorPortions.reduce((sum, p) => sum + (p.voteAllocationBps ?? p.ownershipBps ?? 0), 0);

					if (associateRelationship === 'delegate') {
						// Authorised Delegate votes on behalf of Main PLO
						totalVoteBps = sponsorVoteAllocationBps;
						totalBps = sponsorOwnershipBps;
					} else if (associateRelationship === 'co_owner') {
						// Co-owner holds joint scheduling rights, but cannot vote
						totalBps = sponsorOwnershipBps;
						totalVoteBps = 0;
					} else {
						// Family member: view only
						totalBps = 0;
						totalVoteBps = 0;
					}
				}

				event.locals.session = sessionData.session;
				event.locals.user = {
					id: fullUser.id,
					name: fullUser.name,
					email: fullUser.email,
					username: fullUser.username,
					roles: parsedRoles,
					disabled: fullUser.status === 'disabled' || fullUser.status === 'archived',
					ownershipPercentage: totalBps / 100, // e.g. 1425 bps -> 14.25%
					voteWeightBps: totalVoteBps,
					associateRelationship,
					sponsoringMainPloUserId,
					sponsorName
				};
			} else {
				event.locals.session = null;
				event.locals.user = null;
			}
		} else {
			event.locals.session = null;
			event.locals.user = null;
		}
	} catch (err) {
		event.locals.session = null;
		event.locals.user = null;
	}

	const { pathname } = event.url;

	const isPublicRoute =
		pathname === '/login' ||
		pathname.startsWith('/api/auth') ||
		pathname === '/set-password' ||
		pathname.startsWith('/set-password') ||
		pathname.startsWith('/invite');

	// Unauthenticated route guard
	if (!event.locals.user && !isPublicRoute) {
		if (pathname.startsWith('/api/')) {
			return new Response(JSON.stringify({ error: 'Unauthorized' }), {
				status: 401,
				headers: { 'Content-Type': 'application/json' }
			});
		}
		throw redirect(303, `/login?redirectTo=${encodeURIComponent(pathname)}`);
	}

	const isSecretary = hasAnyRole(event.locals.user?.roles, ['secretary']);

	// Redirect authenticated user visiting /login directly to appropriate landing page
	if (event.locals.user && pathname === '/login') {
		throw redirect(303, isSecretary ? '/dashboard' : '/operations?tab=calendar');
	}

	// Redirect root / directly to dashboard if secretary, or calendar if non-secretary, or /login if not
	if (pathname === '/') {
		if (!event.locals.user) throw redirect(303, '/login');
		throw redirect(303, isSecretary ? '/dashboard' : '/operations?tab=calendar');
	}

	// Strict Role-Based Route Guards for Testing Phase
	// Only the Secretary can see all the functionality.
	// PLO Main Members, Executive members, and PLO invited members for now should only see Shared Calendar and Polls.
	if (event.locals.user && !isSecretary) {
		const allowedPrefixes = [
			'/operations',
			'/calendar',
			'/governance',
			'/profile',
			'/logout',
			'/login',
			'/api/auth'
		];
		const isAllowed = allowedPrefixes.some((p) => pathname === p || pathname.startsWith(p + '/') || pathname.startsWith(p + '?'));
		if (!isAllowed) {
			throw redirect(303, '/operations?tab=calendar');
		}

		// Also prevent non-secretary from accessing poll management subroutes
		if (pathname.startsWith('/governance/manage')) {
			throw redirect(303, '/governance');
		}
	} else if (event.locals.user && isSecretary) {
		if (pathname.startsWith('/admin') && !hasAnyRole(event.locals.user?.roles, ['secretary'])) {
			throw error(403, { message: 'Access Denied: The Secretary role is required to view this area.' });
		}
	}

	const response = await resolve(event);

	// Prevent browser and CDN caching of dynamic content, authenticated routes, and SvelteKit data fetches
	const isImmutableAsset = pathname.startsWith('/_app/immutable/');
	if (!isImmutableAsset) {
		response.headers.set('Cache-Control', 'private, no-cache, no-store, must-revalidate, max-age=0');
		response.headers.set('Pragma', 'no-cache');
		response.headers.set('Expires', '0');
	}

	return response;
};
