import type { PageServerLoad } from './$types';
import { getDb, schema } from '$lib/server/db';
import { eq, desc, and } from 'drizzle-orm';
import { canAccessFinance } from '$lib/auth/roles';

export const load: PageServerLoad = async ({ locals, platform }) => {
	if (!platform?.env?.DB) {
		return {
			user: locals.user,
			members: [],
			portions: [],
			upcomingVisits: [],
			activePolls: [],
			quotaSummary: {
				totalAllocated: 0,
				totalHunted: 0,
				totalRemaining: 0,
				allocations: []
			},
			latestCensus: null,
			latestDocument: null,
			stats: { totalHectares: 0, totalBps: 0, totalPercentage: 0 }
		};
	}

	const db = getDb(platform.env.DB);

	// 1. Members & Portions breakdown
	const portions = await db.query.landPortions.findMany({
		where: eq(schema.landPortions.status, 'active'),
		with: {
			owner: true
		}
	});

	const totalHectares = portions.reduce((sum, p) => sum + (p.hectares || 0), 0);
	const totalBps = portions.reduce((sum, p) => sum + (p.ownershipBps || 0), 0);

	// 2. Upcoming calendar visits
	const today = new Date().toISOString().split('T')[0];
	const visits = await db.query.calendarEntries.findMany({
		where: (ce, { gte }) => gte(ce.endDate, today),
		orderBy: (ce, { asc }) => [asc(ce.startDate)],
		limit: 4,
		with: {
			member: true
		}
	});

	// 3. Active Voting Polls
	const polls = await db.query.votingPolls.findMany({
		where: eq(schema.votingPolls.status, 'open'),
		orderBy: (vp, { asc }) => [asc(vp.closesAt)],
		limit: 3,
		with: {
			votes: true
		}
	});

	// 4. Personal Quota Summary (for logged-in member)
	let userAllocations: any[] = [];
	if (locals.user?.id) {
		userAllocations = await db.query.quotaAllocations.findMany({
			where: eq(schema.quotaAllocations.userId, locals.user.id),
			with: {
				quota: true
			}
		});
	}

	const totalAllocated = userAllocations.reduce((sum, a) => sum + (a.allocatedHead || 0), 0);
	const totalHunted = userAllocations.reduce((sum, a) => sum + (a.huntedHead || 0), 0);
	const totalRemaining = Math.max(0, totalAllocated - totalHunted);

	// 5. Latest Game Census Record
	const latestCensus = await db.query.gameCounts.findFirst({
		orderBy: (gc, { desc }) => [desc(gc.date), desc(gc.createdAt)]
	});

	// 6. Latest Document Upload
	const latestDocument = await db.query.documents.findFirst({
		orderBy: (doc, { desc }) => [desc(doc.createdAt)]
	});

	// 7. Executive Financial quick glance
	let executiveLiquidityCents: number | null = null;
	if (locals.user && canAccessFinance(locals.user.roles)) {
		const finRecords = await db.query.financialRecords.findMany({
			columns: {
				amountCents: true
			}
		});
		executiveLiquidityCents = finRecords.reduce((sum, r) => sum + r.amountCents, 0);
	}

	return {
		user: locals.user,
		portions,
		upcomingVisits: visits,
		activePolls: polls,
		quotaSummary: {
			totalAllocated,
			totalHunted,
			totalRemaining,
			allocations: userAllocations
		},
		latestCensus,
		latestDocument,
		executiveLiquidityCents,
		stats: {
			totalHectares,
			totalBps,
			totalPercentage: totalBps / 100
		}
	};
};
