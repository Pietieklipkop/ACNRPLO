import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { getDb, schema } from '$lib/server/db';
import { eq, or, sql } from 'drizzle-orm';

export const load: PageServerLoad = async ({ locals, url }) => {
	if (locals.user) {
		const isSecretary = locals.user.roles?.includes('secretary');
		throw redirect(303, isSecretary ? '/dashboard' : '/operations?tab=calendar');
	}
	return {
		redirectTo: url.searchParams.get('redirectTo') || '',
		registered: url.searchParams.get('registered') === '1',
		prefillEmail: url.searchParams.get('email') || ''
	};
};

export const actions: Actions = {
	default: async ({ request, locals, platform, url }) => {
		const formData = await request.formData();
		const identifier = formData.get('identifier')?.toString().trim() || '';
		const password = formData.get('password')?.toString() || '';
		const rawRedirect = url.searchParams.get('redirectTo') || '';

		if (!identifier || !password) {
			return fail(400, {
				identifier,
				error: 'Please enter both your username/email and password.'
			});
		}

		if (!platform?.env?.DB) {
			return fail(500, {
				identifier,
				error: 'Database connection is not available.'
			});
		}

		const db = getDb(platform.env.DB);
		const idLower = identifier.toLowerCase();

		// Find user by either email or username (with friendly aliases)
		const existingUser = await db.query.user.findFirst({
			where: or(
				eq(schema.user.email, idLower),
				eq(schema.user.username, idLower),
				idLower === 'secretary' ? eq(schema.user.email, 'stefan@dialogdev.net') : sql`0 = 1`,
				idLower === 'willem' ? eq(schema.user.email, 'willem@scholtzrad.co.za') : sql`0 = 1`,
				idLower === 'desf' || idLower === 'des' ? eq(schema.user.email, 'desf@insurancezone.co.za') : sql`0 = 1`
			)
		});

		if (!existingUser) {
			return fail(401, {
				identifier,
				error: 'Invalid credentials. User not found.'
			});
		}

		if (existingUser.status !== 'active') {
			return fail(403, {
				identifier,
				error: 'This account is not active. Please contact the Secretary.'
			});
		}

		try {
			// Sign in via Better Auth using the user's canonical email
			await locals.auth.api.signInEmail({
				body: {
					email: existingUser.email,
					password
				},
				headers: request.headers
			});
		} catch (err: any) {
			return fail(401, {
				identifier,
				error: err.message || 'Incorrect password. Please try again.'
			});
		}

		let userRoles: string[] = [];
		try {
			userRoles = JSON.parse(existingUser.roles || '[]');
		} catch {
			userRoles = [];
		}

		const isSecretary = userRoles.includes('secretary');
		const defaultDestination = isSecretary ? '/dashboard' : '/operations?tab=calendar';
		let isSafeRelative = false;
		if (
			rawRedirect.startsWith('/') &&
			!rawRedirect.startsWith('//') &&
			!/[\x00-\x1f\x7f\\]/.test(rawRedirect)
		) {
			try {
				isSafeRelative = new URL(rawRedirect, url.origin).origin === url.origin;
			} catch {
				isSafeRelative = false;
			}
		}
		const destination =
			isSafeRelative &&
			(isSecretary ||
				rawRedirect.startsWith('/operations') ||
				rawRedirect.startsWith('/calendar') ||
				rawRedirect.startsWith('/governance'))
				? rawRedirect
				: defaultDestination;

		throw redirect(303, destination);
	}
};
