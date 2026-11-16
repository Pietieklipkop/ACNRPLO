import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { getDb, schema } from '$lib/server/db';
import { eq, and, desc } from 'drizzle-orm';
import { logAuditEvent } from '$lib/server/audit';
import { canVote, hasAnyRole } from '$lib/auth/roles';

export const load: PageServerLoad = async ({ locals, platform, url }) => {
	if (!locals.user) {
		throw redirect(303, '/login');
	}

	const currentUser = locals.user;
	const isSecretary = currentUser.roles.includes('secretary');
	const userCanVote = canVote(currentUser.roles, currentUser.associateRelationship);

	if (!platform?.env?.DB) {
		return {
			user: currentUser,
			activeTab: url.searchParams.get('tab') || 'polls',
			openPolls: [],
			closedPolls: [],
			draftPolls: [],
			portions: [],
			associates: [],
			mainPloMembers: [],
			stats: { totalHectares: 0, totalBps: 0, totalPercentage: 0 },
			canVote: userCanVote,
			isSecretary
		};
	}

	const db = getDb(platform.env.DB);

	// Parallelize all independent D1 queries to eliminate serial network latency waterfalls
	const [allPolls, portions, associates, allUsers] = await Promise.all([
		db.query.votingPolls.findMany({
			orderBy: (vp, { desc }) => [desc(vp.createdAt)],
			with: {
				creator: true,
				votes: {
					with: {
						voter: true
					}
				}
			}
		}),
		db.query.landPortions.findMany({
			where: eq(schema.landPortions.status, 'active'),
			with: { owner: true }
		}),
		db.query.associates.findMany({
			where: isSecretary ? undefined : eq(schema.associates.sponsoringMainPloUserId, currentUser.id),
			with: {
				associateUser: true,
				sponsorUser: true
			}
		}),
		isSecretary
			? db.query.user.findMany({
					where: eq(schema.user.status, 'active')
				})
			: Promise.resolve([])
	]);

	const openPolls = allPolls.filter((p) => p.status === 'open' || p.status === 'active');
	const closedPolls = allPolls.filter((p) => p.status === 'closed');
	const draftPolls = allPolls.filter((p) => p.status === 'draft');

	const totalHectares = portions.reduce((sum, p) => sum + (p.hectares || 0), 0);
	const totalBps = portions.reduce((sum, p) => sum + (p.ownershipBps || 0), 0);

	// Main PLO Members roster for Secretary proxy voting
	let mainPloMembers: Array<{
		id: string;
		name: string;
		email: string;
		voteWeightBps: number;
		ownershipPercentage: number;
		portionNames: string;
	}> = [];

	if (isSecretary) {
		mainPloMembers = allUsers
			.map((u) => {
				let roles: string[] = [];
				try {
					roles = JSON.parse(u.roles || '[]');
				} catch {}
				const userPortions = portions.filter((p) => p.userId === u.id);
				const userBps = userPortions.reduce((sum, p) => sum + (p.voteAllocationBps ?? p.ownershipBps ?? 0), 0);
				const portionNames = userPortions.map((p) => p.portionName).join(', ');
				return {
					id: u.id,
					name: u.name,
					email: u.email,
					roles,
					voteWeightBps: userBps,
					ownershipPercentage: userBps / 100,
					portionNames: portionNames || 'Registered Member'
				};
			})
			.filter((u) => (u.roles.includes('main_plo') || u.roles.includes('executive')) && u.voteWeightBps > 0)
			.sort((a, b) => a.name.localeCompare(b.name));
	}

	return {
		user: currentUser,
		activeTab: url.searchParams.get('tab') || 'polls',
		openPolls,
		closedPolls,
		draftPolls,
		portions,
		associates,
		mainPloMembers,
		stats: {
			totalHectares,
			totalBps,
			totalPercentage: totalBps / 100
		},
		canVote: userCanVote,
		isSecretary
	};
};

export const actions: Actions = {
	castVote: async ({ request, locals, platform }) => {
		if (!locals.user) return fail(401, { error: 'Authentication required' });

		const isSecretary = locals.user.roles.includes('secretary');
		const formData = await request.formData();
		const pollId = formData.get('pollId')?.toString();
		const choice = formData.get('choice')?.toString();
		const targetUserId = formData.get('targetUserId')?.toString()?.trim();
		const rawChannel = formData.get('channel')?.toString()?.trim() || 'WhatsApp';
		const rawNotes = formData.get('notes')?.toString()?.trim() || '';

		if (!pollId || !choice || !['agree', 'disagree', 'abstain'].includes(choice)) {
			return fail(400, { error: 'Invalid decision ballot parameters.' });
		}

		if (targetUserId && !isSecretary) {
			return fail(403, { error: 'Unauthorized: Non-secretary members cannot cast proxy ballots.' });
		}

		const isSecretaryProxy = isSecretary && !!targetUserId;

		if (!isSecretaryProxy && !canVote(locals.user.roles, locals.user.associateRelationship)) {
			if (locals.user.associateRelationship === 'family') {
				return fail(403, { error: 'Unauthorized: Family members have view-only access and cannot vote on decisions.' });
			}
			if (locals.user.associateRelationship === 'co_owner') {
				return fail(403, { error: 'Unauthorized: Co-owners hold calendar rights. Only the Main PLO, an Authorised Delegate, or the Secretary (via proxy) may cast ballots.' });
			}
			return fail(403, { error: 'Unauthorized: Only Main PLO members and Authorised Delegates hold voting power.' });
		}

		const ALLOWED_CHANNELS = ['WhatsApp', 'Phone Call', 'SMS', 'Email', 'In Person'];
		const channel = ALLOWED_CHANNELS.includes(rawChannel) ? rawChannel : 'WhatsApp';
		const notes = rawNotes.slice(0, 500);

		if (!platform?.env?.DB) return fail(500, { error: 'Database unavailable' });
		const db = getDb(platform.env.DB);

		const poll = await db.query.votingPolls.findFirst({
			where: eq(schema.votingPolls.id, pollId)
		});

		if (!poll || (poll.status !== 'open' && poll.status !== 'active')) {
			return fail(400, { error: 'This decision is not open for ballots.' });
		}

		// Enforce decision closing date deadline
		if (poll.closesAt && new Date() > new Date(poll.closesAt)) {
			return fail(400, { error: 'Ballot rejected: The voting deadline for this decision has expired.' });
		}

		let sponsorUserId: string;
		let targetUserName: string = '';

		if (isSecretaryProxy) {
			const targetUser = await db.query.user.findFirst({
				where: eq(schema.user.id, targetUserId)
			});
			if (!targetUser) {
				return fail(404, { error: 'Selected landowner member not found.' });
			}
			if (targetUser.status !== 'active') {
				return fail(400, { error: 'Selected landowner member account is inactive or disabled.' });
			}
			let targetRoles: string[] = [];
			try {
				targetRoles = JSON.parse(targetUser.roles || '[]');
			} catch {}
			if (!targetRoles.includes('main_plo') && !targetRoles.includes('executive')) {
				return fail(400, { error: 'Selected member does not hold voting landowner status.' });
			}

			sponsorUserId = targetUserId;
			targetUserName = targetUser.name;
		} else {
			const isDelegate = locals.user.associateRelationship === 'delegate' && !!locals.user.sponsoringMainPloUserId;
			sponsorUserId = isDelegate ? locals.user.sponsoringMainPloUserId! : locals.user.id;
		}

		// Find all user IDs authorized to vote for this portion: Main PLO member + any authorised delegates
		const delegates = await db.query.associates.findMany({
			where: and(
				eq(schema.associates.sponsoringMainPloUserId, sponsorUserId),
				eq(schema.associates.relationship, 'delegate')
			)
		});
		const relatedVoterIds = new Set([sponsorUserId, ...delegates.map((d) => d.associateUserId)]);

		const allPollVotes = await db.query.votes.findMany({
			where: eq(schema.votes.pollId, pollId)
		});
		const existingBallot = allPollVotes.find((v) => relatedVoterIds.has(v.userId));

		if (existingBallot) {
			if (isSecretaryProxy) {
				return fail(400, {
					error: `A ballot has already been recorded for ${targetUserName || 'this landowner portion'}.`
				});
			}
			const isSelf = existingBallot.userId === locals.user.id;
			return fail(400, {
				error: isSelf
					? 'You have already recorded a ballot for this decision.'
					: 'A ballot has already been recorded for this landowner portion by either the landowner, their delegate, or recorded via Secretary proxy.'
			});
		}

		// Calculate voter's basis points from the sponsoring landowner's portion using nullish coalescing
		const portions = await db.query.landPortions.findMany({
			where: and(eq(schema.landPortions.userId, sponsorUserId), eq(schema.landPortions.status, 'active'))
		});
		const weightBps = portions.reduce((sum, p) => sum + (p.voteAllocationBps ?? p.ownershipBps ?? 0), 0);

		if (weightBps <= 0) {
			return fail(400, {
				error: isSecretaryProxy
					? `Landowner ${targetUserName} has no active voting weight allocated.`
					: locals.user.associateRelationship === 'delegate'
						? 'No active voting allocation registered to your sponsoring landowner portion.'
						: 'No active voting allocation registered to your land portions.'
			});
		}

		const ballotId = crypto.randomUUID();

		try {
			// Anchor vote to sponsorUserId so the landowner immediately sees the recorded ballot in their account
			await db.insert(schema.votes).values({
				id: ballotId,
				pollId,
				userId: sponsorUserId,
				choice: choice as 'agree' | 'disagree' | 'abstain',
				weightBps,
				votedAt: new Date()
			});
		} catch (err: any) {
			if (err?.message?.includes('UNIQUE') || err?.message?.includes('constraint')) {
				return fail(400, { error: 'A ballot has already been recorded for this landowner portion.' });
			}
			throw err;
		}

		if (isSecretaryProxy) {
			await logAuditEvent(platform.env.DB, {
				userId: locals.user.id,
				userEmail: locals.user.email,
				roleAtTime: 'secretary',
				actionType: 'DECISION_PROXY_VOTE_CAST',
				recordId: ballotId,
				recordType: 'votes',
				details: {
					pollId,
					decisionTitle: poll.title,
					targetUserId,
					targetUserName,
					choice,
					weightBps,
					channel,
					notes
				}
			});
		} else {
			const isDelegate = locals.user.associateRelationship === 'delegate';
			await logAuditEvent(platform.env.DB, {
				userId: locals.user.id,
				userEmail: locals.user.email,
				roleAtTime: isDelegate ? 'associate:delegate' : locals.user.roles.join(','),
				actionType: 'DECISION_VOTE_CAST',
				recordId: ballotId,
				recordType: 'votes',
				details: {
					pollId,
					decisionTitle: poll.title,
					choice,
					weightBps,
					votedOnBehalfOf: isDelegate ? sponsorUserId : null
				}
			});
		}

		return { success: true };
	},

	createDecision: async ({ request, locals, platform }) => {
		if (!locals.user || !hasAnyRole(locals.user.roles, ['secretary'])) {
			return fail(403, { error: 'Unauthorized: Secretary role required to create decisions.' });
		}
		if (!platform?.env?.DB) return fail(500, { error: 'Database unavailable' });

		const formData = await request.formData();
		const title = formData.get('title')?.toString().trim();
		const description = formData.get('description')?.toString().trim();
		const resolutionType = formData.get('resolutionType')?.toString() || 'simple';
		const closesAtRaw = formData.get('closesAt')?.toString();

		if (!title || !description) {
			return fail(400, { error: 'Title and description are required.' });
		}

		const validResolutionType = resolutionType === 'special' ? 'special' : 'simple';

		let closesAt: Date;
		if (closesAtRaw) {
			closesAt = new Date(closesAtRaw);
			if (isNaN(closesAt.getTime())) {
				return fail(400, { error: 'Invalid closing date format.' });
			}
		} else {
			closesAt = new Date(Date.now() + 14 * 86400 * 1000);
		}

		const db = getDb(platform.env.DB);
		const id = crypto.randomUUID();

		await db.insert(schema.votingPolls).values({
			id,
			title,
			description,
			resolutionType: validResolutionType,
			status: 'open',
			createdBy: locals.user.id,
			closesAt
		});

		await logAuditEvent(platform.env.DB, {
			userId: locals.user.id,
			userEmail: locals.user.email,
			roleAtTime: 'secretary',
			actionType: 'DECISION_CREATED',
			recordId: id,
			recordType: 'poll',
			details: { title, resolutionType: validResolutionType, closesAt: closesAt.toISOString() }
		});

		return { success: true };
	},

	createAssociate: async ({ request, locals, platform }) => {
		if (!locals.user || !hasAnyRole(locals.user.roles, ['main_plo', 'secretary'])) {
			return fail(403, { error: 'Only Main PLO Members or the Secretary can add Associate Members.' });
		}
		if (!platform?.env?.DB || !locals.auth) return fail(500, { error: 'Service unavailable' });

		const isSecretary = locals.user.roles.includes('secretary');
		const formData = await request.formData();
		const name = formData.get('name')?.toString().trim();
		const email = formData.get('email')?.toString().trim().toLowerCase();
		const username = formData.get('username')?.toString().trim();
		const phone = formData.get('phone')?.toString().trim() || null;
		const relationship = formData.get('relationship')?.toString().trim() || 'family';
		const password = formData.get('password')?.toString();
		const explicitSponsorId = formData.get('sponsoringMainPloUserId')?.toString()?.trim();

		if (!name || !email || !password) {
			return fail(400, { error: 'Name, email, and password are required.' });
		}

		const sponsorId = isSecretary && explicitSponsorId ? explicitSponsorId : locals.user.id;

		const db = getDb(platform.env.DB);
		const existing = await db.query.user.findFirst({ where: eq(schema.user.email, email) });
		if (existing) return fail(400, { error: 'A member with this email already exists.' });

		const signUpRes = await locals.auth.api.signUpEmail({
			body: { name, email, password, username, phone }
		});

		if (!signUpRes?.user) return fail(500, { error: 'Failed to create associate member account.' });

		await db
			.update(schema.user)
			.set({ roles: JSON.stringify(['associate']), status: 'active' })
			.where(eq(schema.user.id, signUpRes.user.id));

		const associateId = crypto.randomUUID();
		await db.insert(schema.associates).values({
			id: associateId,
			associateUserId: signUpRes.user.id,
			sponsoringMainPloUserId: sponsorId,
			relationship
		});

		await logAuditEvent(platform.env.DB, {
			userId: locals.user.id,
			userEmail: locals.user.email,
			roleAtTime: locals.user.roles.join(','),
			actionType: 'ASSOCIATE_CREATED',
			recordId: associateId,
			recordType: 'associates',
			details: { sponsorId, associateEmail: email, relationship }
		});

		return { success: true };
	},

	deleteAssociate: async ({ request, locals, platform }) => {
		if (!locals.user || !hasAnyRole(locals.user.roles, ['main_plo', 'secretary'])) {
			return fail(403, { error: 'Unauthorized.' });
		}
		if (!platform?.env?.DB) return fail(500, { error: 'Database unavailable' });

		const formData = await request.formData();
		const id = formData.get('id')?.toString().trim();
		if (!id) return fail(400, { error: 'Missing identifier.' });

		const db = getDb(platform.env.DB);
		const existing = await db.query.associates.findFirst({
			where: eq(schema.associates.id, id)
		});
		if (!existing) return fail(404, { error: 'Associate relationship not found.' });

		if (!locals.user.roles.includes('secretary') && existing.sponsoringMainPloUserId !== locals.user.id) {
			return fail(403, { error: 'You can only remove your own linked associates.' });
		}

		await db.delete(schema.associates).where(eq(schema.associates.id, id));

		// Check if this associate user has any other active associations
		const otherAssocs = await db.query.associates.findMany({
			where: eq(schema.associates.associateUserId, existing.associateUserId)
		});

		// If no other associations and they are an associate-only user, disable account and purge active sessions
		if (otherAssocs.length === 0) {
			const assocUser = await db.query.user.findFirst({
				where: eq(schema.user.id, existing.associateUserId)
			});
			if (assocUser) {
				let roles: string[] = [];
				try {
					roles = JSON.parse(assocUser.roles || '[]');
				} catch {}

				if (!roles.includes('main_plo') && !roles.includes('secretary') && !roles.includes('executive')) {
					await db
						.update(schema.user)
						.set({ status: 'disabled' })
						.where(eq(schema.user.id, existing.associateUserId));

					await db
						.delete(schema.session)
						.where(eq(schema.session.userId, existing.associateUserId));
				}
			}
		}

		await logAuditEvent(platform.env.DB, {
			userId: locals.user.id,
			userEmail: locals.user.email,
			roleAtTime: locals.user.roles.join(','),
			actionType: 'ASSOCIATE_DELETED',
			recordId: id,
			recordType: 'associates',
			details: { deletedRelation: existing }
		});

		return { success: true };
	}
};
