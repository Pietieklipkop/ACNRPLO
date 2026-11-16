import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { getDb, schema } from '$lib/server/db';
import { eq, and, desc, sql, asc } from 'drizzle-orm';
import { logAuditEvent } from '$lib/server/audit';
import { canBookCalendar, canVote, hasAnyRole, type UserRole } from '$lib/auth/roles';
import { ensureMasterData } from '$lib/server/db/seed';
import { getMemberColor } from '$lib/constants/member-colors';

export const load: PageServerLoad = async ({ locals, platform, url }) => {
	if (!locals.user) {
		throw redirect(303, '/login');
	}

	const currentUser = locals.user;
	const isSecretary = currentUser.roles.includes('secretary');
	const canManageHunt = hasAnyRole(currentUser.roles, ['main_plo', 'executive', 'secretary']);
	const canBook = canBookCalendar(currentUser.roles, currentUser.associateRelationship);

	if (!platform?.env?.DB) {
		return {
			user: currentUser,
			activeTab: url.searchParams.get('tab') || 'calendar',
			calendar: { entries: [], members: [], canBook },
			quotas: {
				list: [],
				myAllocations: [],
				buyRequests: [],
				huntLogs: [],
				stats: { totalQuota: 0, totalHunted: 0, remainingQuota: 0 }
			},
			census: { counts: [], stats: { totalSurveyed: 0, totalSpecies: 0 } },
			masterSpecies: [],
			masterVisitCategories: [],
			isSecretary,
			canManageHunt
		};
	}

	const db = getDb(platform.env.DB);

	// Ensure default master data (species and visit categories) exists
	await ensureMasterData(platform.env.DB);

	// Parallel fetch of all operations datasets
	const [
		masterSpecies,
		masterVisitCategories,
		rawEntries,
		portions,
		activeUsers,
		rawQuotas,
		allocations,
		rawBuyRequests,
		rawHunts,
		counts,
		allAssociates
	] = await Promise.all([
		db.query.masterSpecies.findMany({
			where: eq(schema.masterSpecies.isActive, 1),
			orderBy: (ms, { asc }) => [asc(ms.name)]
		}),
		db.query.masterVisitCategories.findMany({
			where: eq(schema.masterVisitCategories.isActive, 1),
			orderBy: (mc, { asc }) => [asc(mc.label)]
		}),
		db.query.calendarEntries.findMany({
			orderBy: (ce, { asc }) => [asc(ce.startDate)],
			with: { member: true }
		}),
		db.query.landPortions.findMany({
			where: eq(schema.landPortions.status, 'active')
		}),
		db.query.user.findMany({
			where: eq(schema.user.status, 'active'),
			orderBy: (u, { asc }) => [asc(u.name)]
		}),
		db.query.quotas.findMany({
			orderBy: (q, { asc }) => [asc(q.category), asc(q.species)]
		}),
		db.query.quotaAllocations.findMany({
			with: { quota: true, user: true }
		}),
		db.query.quotaBuyRequests.findMany({
			orderBy: (br, { desc }) => [desc(br.createdAt)],
			with: { requester: true, fulfilledBy: true }
		}),
		db.query.huntingLogs.findMany({
			orderBy: (hl, { desc }) => [desc(hl.date), desc(hl.createdAt)],
			with: { hunter: true }
		}),
		db.query.gameCounts.findMany({
			orderBy: (gc, { desc }) => [desc(gc.date), desc(gc.createdAt)]
		}),
		db.query.associates.findMany()
	]);

	const portionMap = new Map<string, string[]>();
	for (const p of portions) {
		if (p.userId) {
			const existing = portionMap.get(p.userId) || [];
			existing.push(p.portionName);
			portionMap.set(p.userId, existing);
		}
	}

	// Also inherit portion names for linked associates from their sponsoring Main PLO member
	for (const a of allAssociates) {
		const sponsorPortions = portionMap.get(a.sponsoringMainPloUserId) || [];
		if (sponsorPortions.length > 0) {
			portionMap.set(a.associateUserId, sponsorPortions);
		}
	}

	const calendarMembers = activeUsers.map((u, idx) => {
		let roles: UserRole[] = [];
		try {
			roles = JSON.parse(u.roles || '[]');
		} catch {
			roles = [];
		}
		return {
			id: u.id,
			name: u.name,
			roles,
			color: getMemberColor(u, idx),
			portions: portionMap.get(u.id) || []
		};
	});

	const calendarEntries = rawEntries.map((e) => {
		let roles: UserRole[] = [];
		try {
			roles = JSON.parse(e.member.roles || '[]');
		} catch {
			roles = [];
		}
		return {
			id: e.id,
			userId: e.userId,
			startDate: e.startDate,
			endDate: e.endDate,
			purpose: e.purpose,
			notes: e.notes,
			createdAt: e.createdAt,
			member: {
				id: e.member.id,
				name: e.member.name,
				roles,
				color: getMemberColor(e.member),
				portions: portionMap.get(e.userId) || []
			}
		};
	});

	const myAllocations = allocations.filter((a) => a.userId === currentUser.id);

	const buyRequests = rawBuyRequests.map((br) => ({
		...br,
		requesterPortions: portionMap.get(br.userId) || []
	}));

	const quotaStats = {
		totalQuota: rawQuotas.reduce((sum, q) => sum + q.totalAllocation, 0),
		totalHunted: allocations.reduce((sum, a) => sum + a.huntedHead, 0),
		remainingQuota:
			rawQuotas.reduce((sum, q) => sum + q.totalAllocation, 0) -
			allocations.reduce((sum, a) => sum + a.huntedHead, 0)
	};

	const censusStats = {
		totalSurveyed: counts.reduce((sum, c) => sum + c.count, 0),
		totalSpecies: new Set(counts.map((c) => c.species)).size
	};

	return {
		user: currentUser,
		activeTab: url.searchParams.get('tab') || 'calendar',
		calendar: {
			entries: calendarEntries,
			members: calendarMembers,
			canBook
		},
		quotas: {
			list: rawQuotas,
			myAllocations,
			buyRequests,
			huntLogs: rawHunts,
			stats: quotaStats
		},
		census: {
			counts,
			stats: censusStats
		},
		masterSpecies,
		masterVisitCategories,
		isSecretary,
		canManageHunt
	};
};

export const actions: Actions = {
	// Calendar actions
	createBooking: async ({ request, locals, platform }) => {
		if (!locals.user || !canBookCalendar(locals.user.roles, locals.user.associateRelationship)) {
			if (locals.user?.associateRelationship === 'family') {
				return fail(403, { error: 'Unauthorized: Family members have view-only access and cannot add entries to the calendar.' });
			}
			if (locals.user?.associateRelationship === 'delegate') {
				return fail(403, { error: 'Unauthorized: Authorised Delegates can only vote on behalf of the Main PLO and cannot add entries to the calendar.' });
			}
			return fail(403, { error: 'Unauthorized: You do not have permission to add calendar entries.' });
		}
		if (!platform?.env?.DB) return fail(500, { error: 'Database unavailable' });

		const formData = await request.formData();
		const startDate = (formData.get('startDate') as string)?.trim();
		const endDate = (formData.get('endDate') as string)?.trim();
		const purpose = (formData.get('purpose') as string)?.trim() || 'leisure';
		const notes = (formData.get('notes') as string)?.trim() || null;
		const targetUserId = (formData.get('targetUserId') as string)?.trim() || locals.user.id;

		const isSecretary = locals.user.roles.includes('secretary');
		const bookingUserId = isSecretary && targetUserId ? targetUserId : locals.user.id;

		if (!startDate || !endDate) {
			return fail(400, { error: 'Both start date and end date are required.' });
		}
		if (startDate > endDate) {
			return fail(400, { error: 'Start date cannot be after end date.' });
		}

		const db = getDb(platform.env.DB);
		const bookingId = crypto.randomUUID();

		await db.insert(schema.calendarEntries).values({
			id: bookingId,
			userId: bookingUserId,
			startDate,
			endDate,
			purpose,
			notes
		});

		await logAuditEvent(platform.env.DB, {
			userId: locals.user.id,
			userEmail: locals.user.email,
			roleAtTime: locals.user.roles.join(','),
			actionType: 'CALENDAR_BOOKING_CREATED',
			recordId: bookingId,
			recordType: 'calendar_entries',
			details: { bookingUserId, startDate, endDate, purpose, notes }
		});

		return { success: true };
	},

	cancelBooking: async ({ request, locals, platform }) => {
		if (!locals.user) return fail(401, { error: 'Unauthorized' });
		if (!platform?.env?.DB) return fail(500, { error: 'Database unavailable' });

		const formData = await request.formData();
		const id = (formData.get('id') as string)?.trim();
		if (!id) return fail(400, { error: 'Missing booking ID' });

		const db = getDb(platform.env.DB);
		const existing = await db.query.calendarEntries.findFirst({
			where: eq(schema.calendarEntries.id, id)
		});

		if (!existing) return fail(404, { error: 'Booking not found' });

		const isSecretary = locals.user.roles.includes('secretary');
		if (existing.userId !== locals.user.id && !isSecretary) {
			return fail(403, { error: 'You can only cancel your own bookings.' });
		}

		await db.delete(schema.calendarEntries).where(eq(schema.calendarEntries.id, id));

		await logAuditEvent(platform.env.DB, {
			userId: locals.user.id,
			userEmail: locals.user.email,
			roleAtTime: locals.user.roles.join(','),
			actionType: 'CALENDAR_BOOKING_CANCELLED',
			recordId: id,
			recordType: 'calendar_entries',
			details: { cancelledBooking: existing }
		});

		return { success: true };
	},

	// Hunting & Quota actions
	logHunt: async ({ request, locals, platform }) => {
		if (!locals.user || !hasAnyRole(locals.user.roles, ['main_plo', 'executive', 'secretary'])) {
			return fail(403, { error: 'Unauthorized to log biological off-take.' });
		}
		if (!platform?.env?.DB) return fail(500, { error: 'Database unavailable' });

		const formData = await request.formData();
		const quotaId = (formData.get('quotaId') as string)?.trim();
		const headCount = parseInt(formData.get('headCount') as string, 10);
		const date = (formData.get('date') as string)?.trim();
		const hunterName = (formData.get('hunterName') as string)?.trim();
		const firearmCaliber = (formData.get('firearmCaliber') as string)?.trim() || null;
		const notes = (formData.get('notes') as string)?.trim() || null;

		if (!quotaId || isNaN(headCount) || headCount <= 0 || !date || !hunterName) {
			return fail(400, { error: 'Please provide all required fields with valid counts.' });
		}

		const db = getDb(platform.env.DB);
		const quota = await db.query.quotas.findFirst({
			where: eq(schema.quotas.id, quotaId)
		});
		if (!quota) return fail(404, { error: 'Quota not found.' });

		const [updatedAlloc] = await db
			.update(schema.quotaAllocations)
			.set({
				huntedHead: sql`${schema.quotaAllocations.huntedHead} + ${headCount}`,
				updatedAt: new Date()
			})
			.where(
				and(
					eq(schema.quotaAllocations.quotaId, quotaId),
					eq(schema.quotaAllocations.userId, locals.user.id),
					sql`(${schema.quotaAllocations.allocatedHead} - ${schema.quotaAllocations.huntedHead}) >= ${headCount}`
				)
			)
			.returning();

		if (!updatedAlloc) {
			return fail(400, { error: 'Head count exceeds your remaining quota balance.' });
		}

		const huntLogId = crypto.randomUUID();
		await db.insert(schema.huntingLogs).values({
			id: huntLogId,
			userId: locals.user.id,
			quotaId,
			species: quota.species,
			headCount,
			date,
			hunterName,
			firearmCaliber,
			notes
		});

		await logAuditEvent(platform.env.DB, {
			userId: locals.user.id,
			userEmail: locals.user.email,
			roleAtTime: locals.user.roles.join(','),
			actionType: 'HUNT_LOGGED',
			recordId: huntLogId,
			recordType: 'hunting_logs',
			details: { species: quota.species, headCount, hunterName, firearmCaliber }
		});

		return { success: true };
	},

	// Quota Acquisition Requests (Want-to-Buy from Peer PLOs)
	createBuyRequest: async ({ request, locals, platform }) => {
		if (!locals.user || !hasAnyRole(locals.user.roles, ['main_plo', 'executive', 'secretary'])) {
			return fail(403, { error: 'Unauthorized: Landowner status required.' });
		}
		if (!platform?.env?.DB) return fail(500, { error: 'Database unavailable' });

		const formData = await request.formData();
		const species = (formData.get('species') as string)?.trim();
		const headCount = parseInt(formData.get('headCount') as string, 10);
		const offerPriceZarRaw = (formData.get('offerPriceZar') as string)?.trim();
		const notes = (formData.get('notes') as string)?.trim() || null;

		if (!species || isNaN(headCount) || headCount <= 0) {
			return fail(400, { error: 'Species selection and head count (>0) are required.' });
		}

		let offerPriceCents = 0;
		if (offerPriceZarRaw) {
			const parsed = parseFloat(offerPriceZarRaw);
			if (!isNaN(parsed) && parsed > 0) {
				offerPriceCents = Math.round(parsed * 100);
			}
		}

		const db = getDb(platform.env.DB);
		const requestId = crypto.randomUUID();

		await db.insert(schema.quotaBuyRequests).values({
			id: requestId,
			userId: locals.user.id,
			species,
			headCount,
			offerPriceCents,
			notes,
			status: 'open'
		});

		await logAuditEvent(platform.env.DB, {
			userId: locals.user.id,
			userEmail: locals.user.email,
			roleAtTime: locals.user.roles.join(','),
			actionType: 'QUOTA_BUY_REQUEST_CREATED',
			recordId: requestId,
			recordType: 'quota_buy_requests',
			details: { species, headCount, offerPriceCents, notes }
		});

		return { success: true };
	},

	cancelBuyRequest: async ({ request, locals, platform }) => {
		if (!locals.user) return fail(401, { error: 'Unauthorized' });
		if (!platform?.env?.DB) return fail(500, { error: 'Database unavailable' });

		const formData = await request.formData();
		const requestId = (formData.get('requestId') as string)?.trim();
		if (!requestId) return fail(400, { error: 'Missing request ID' });

		const db = getDb(platform.env.DB);
		const existing = await db.query.quotaBuyRequests.findFirst({
			where: eq(schema.quotaBuyRequests.id, requestId)
		});

		if (!existing) return fail(404, { error: 'Request not found' });

		const isSecretary = locals.user.roles.includes('secretary');
		if (existing.userId !== locals.user.id && !isSecretary) {
			return fail(403, { error: 'You can only cancel your own acquisition requests.' });
		}

		await db
			.update(schema.quotaBuyRequests)
			.set({ status: 'cancelled' })
			.where(eq(schema.quotaBuyRequests.id, requestId));

		await logAuditEvent(platform.env.DB, {
			userId: locals.user.id,
			userEmail: locals.user.email,
			roleAtTime: locals.user.roles.join(','),
			actionType: 'QUOTA_BUY_REQUEST_CANCELLED',
			recordId: requestId,
			recordType: 'quota_buy_requests',
			details: { species: existing.species, headCount: existing.headCount }
		});

		return { success: true };
	},

	fulfillBuyRequest: async ({ request, locals, platform }) => {
		if (!locals.user || !hasAnyRole(locals.user.roles, ['main_plo', 'executive', 'secretary'])) {
			return fail(403, { error: 'Unauthorized.' });
		}
		if (!platform?.env?.DB) return fail(500, { error: 'Database unavailable' });

		const formData = await request.formData();
		const requestId = (formData.get('requestId') as string)?.trim();
		if (!requestId) return fail(400, { error: 'Missing request ID' });

		const db = getDb(platform.env.DB);
		const existing = await db.query.quotaBuyRequests.findFirst({
			where: eq(schema.quotaBuyRequests.id, requestId)
		});

		if (!existing || existing.status !== 'open') {
			return fail(404, { error: 'Active acquisition request not found.' });
		}

		if (existing.userId === locals.user.id) {
			return fail(400, { error: 'You cannot fulfill your own acquisition request.' });
		}

		await db
			.update(schema.quotaBuyRequests)
			.set({
				status: 'fulfilled',
				fulfilledByUserId: locals.user.id,
				fulfilledAt: new Date()
			})
			.where(eq(schema.quotaBuyRequests.id, requestId));

		await logAuditEvent(platform.env.DB, {
			userId: locals.user.id,
			userEmail: locals.user.email,
			roleAtTime: locals.user.roles.join(','),
			actionType: 'QUOTA_BUY_REQUEST_FULFILLED',
			recordId: requestId,
			recordType: 'quota_buy_requests',
			details: {
				species: existing.species,
				headCount: existing.headCount,
				requesterId: existing.userId,
				fulfilledBy: locals.user.id
			}
		});

		return { success: true };
	},

	// Census record action
	recordGameCount: async ({ request, locals, platform }) => {
		if (!locals.user || !locals.user.roles.includes('secretary')) {
			return fail(403, { error: 'Secretary role required to record census.' });
		}
		if (!platform?.env?.DB) return fail(500, { error: 'Database unavailable' });

		const formData = await request.formData();
		const species = (formData.get('species') as string)?.trim();
		const count = parseInt(formData.get('count') as string, 10);
		const method = (formData.get('method') as string)?.trim() || 'ground_transect';
		const date = (formData.get('date') as string)?.trim();
		const conductedBy = (formData.get('conductedBy') as string)?.trim();
		const notes = (formData.get('notes') as string)?.trim() || null;

		if (!species || isNaN(count) || count < 0 || !date || !conductedBy) {
			return fail(400, { error: 'Please provide all required fields.' });
		}

		const db = getDb(platform.env.DB);
		const censusId = crypto.randomUUID();

		await db.insert(schema.gameCounts).values({
			id: censusId,
			species,
			count,
			method,
			date,
			conductedBy,
			notes,
			year: parseInt(date.split('-')[0], 10) || 2026
		});

		await logAuditEvent(platform.env.DB, {
			userId: locals.user.id,
			userEmail: locals.user.email,
			roleAtTime: locals.user.roles.join(','),
			actionType: 'GAME_COUNT_RECORDED',
			recordId: censusId,
			recordType: 'game_counts',
			details: { species, count, method, conductedBy }
		});

		return { success: true };
	}
};
