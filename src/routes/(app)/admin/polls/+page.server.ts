import { fail, error } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { getDb, schema } from '$lib/server/db';
import { eq, desc } from 'drizzle-orm';
import { logAuditEvent } from '$lib/server/audit';
import { hasAnyRole } from '$lib/auth/roles';

export const load: PageServerLoad = async ({ locals, platform }) => {
	if (!locals.user || !hasAnyRole(locals.user.roles, ['secretary'])) {
		throw error(403, 'Access Denied: The Secretary role is strictly required to manage Decision Lifecycles.');
	}

	if (!platform?.env?.DB) {
		return {
			user: locals.user,
			polls: []
		};
	}

	const db = getDb(platform.env.DB);

	const polls = await db.query.votingPolls.findMany({
		orderBy: (vp, { desc }) => [desc(vp.createdAt)],
		with: {
			creator: true,
			votes: {
				with: { voter: true }
			}
		}
	});

	return {
		user: locals.user,
		polls
	};
};

const handleCreateDecision = async ({ request, locals, platform }: any) => {
	if (!locals.user || !hasAnyRole(locals.user.roles, ['secretary'])) {
		return fail(403, { error: 'Unauthorized: Secretary role required.' });
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
};

const handleCloseDecision = async ({ request, locals, platform }: any) => {
	if (!locals.user || !hasAnyRole(locals.user.roles, ['secretary'])) {
		return fail(403, { error: 'Unauthorized: Secretary role required.' });
	}
	if (!platform?.env?.DB) return fail(500, { error: 'Database unavailable' });

	const formData = await request.formData();
	const pollId = formData.get('pollId')?.toString();
	if (!pollId) return fail(400, { error: 'Missing decision ID.' });

	const db = getDb(platform.env.DB);
	const poll = await db.query.votingPolls.findFirst({
		where: eq(schema.votingPolls.id, pollId),
		with: { votes: true }
	});

	if (!poll) return fail(404, { error: 'Decision not found' });
	if (poll.status === 'closed') return fail(400, { error: 'Decision is already closed.' });

	let agreeBps = 0;
	let disagreeBps = 0;
	let abstainBps = 0;

	for (const v of poll.votes) {
		if (v.choice === 'agree') agreeBps += v.weightBps;
		if (v.choice === 'disagree') disagreeBps += v.weightBps;
		if (v.choice === 'abstain') abstainBps += v.weightBps;
	}

	const TOTAL_RESERVE_BPS = 10000;
	const totalVotedBps = agreeBps + disagreeBps + abstainBps;
	const effectiveBps = agreeBps + disagreeBps;
	const turnoutPct = (totalVotedBps / TOTAL_RESERVE_BPS) * 100;
	const quorumMet = turnoutPct >= 50.0;
	const agreePct = effectiveBps > 0 ? (agreeBps / effectiveBps) * 100 : 0;
	const passed = quorumMet && (poll.resolutionType === 'special' ? agreePct >= 75.0 : agreePct > 50.0);
	const resultText = passed ? 'passed' : 'failed';

	await db
		.update(schema.votingPolls)
		.set({
			status: 'closed',
			closedAt: new Date()
		})
		.where(eq(schema.votingPolls.id, pollId));

	await logAuditEvent(platform.env.DB, {
		userId: locals.user.id,
		userEmail: locals.user.email,
		roleAtTime: 'secretary',
		actionType: 'DECISION_CLOSED',
		recordId: pollId,
		recordType: 'poll',
		details: {
			decisionTitle: poll.title,
			result: resultText,
			agreeBps,
			disagreeBps,
			abstainBps,
			totalVotedBps,
			quorumMet,
			turnoutPct: Number(turnoutPct.toFixed(2)),
			agreePct: Number(agreePct.toFixed(2))
		}
	});

	return { success: true };
};

export const actions: Actions = {
	createDecision: handleCreateDecision,
	createPoll: handleCreateDecision,
	closeDecision: handleCloseDecision,
	closePoll: handleCloseDecision
};
