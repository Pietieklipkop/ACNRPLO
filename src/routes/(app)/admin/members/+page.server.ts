import { fail, error } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { getDb, schema } from '$lib/server/db';
import { eq, and, or, desc } from 'drizzle-orm';
import { hashPassword } from 'better-auth/crypto';
import { logAuditEvent } from '$lib/server/audit';
import { hasAnyRole, type UserRole } from '$lib/auth/roles';
import { PLO_MEMBER_PALETTE, getMemberColor } from '$lib/constants/member-colors';

export const load: PageServerLoad = async ({ locals, platform }) => {
	if (!locals.user || !hasAnyRole(locals.user.roles, ['secretary'])) {
		throw error(403, 'Access Denied: The Secretary role is strictly required to manage landowners and portions.');
	}

	if (!platform?.env?.DB) {
		return {
			user: locals.user,
			users: [],
			portions: [],
			associates: [],
			stats: { totalHectares: 0, totalBps: 0, totalPercentage: 0 }
		};
	}

	const db = getDb(platform.env.DB);

	const rawUsers = await db.query.user.findMany({
		orderBy: (u, { desc }) => [desc(u.createdAt)]
	});

	const portions = await db.query.landPortions.findMany({
		with: { owner: true }
	});

	const associatesList = await db.query.associates.findMany({
		with: { associateUser: true, sponsorUser: true }
	});

	const users = rawUsers.map((u, idx) => {
		let roles: UserRole[] = [];
		try {
			roles = JSON.parse(u.roles || '["main_plo"]');
		} catch {
			roles = ['main_plo'];
		}
		const userPortions = portions.filter((p) => p.userId === u.id && p.status === 'active');
		const userHectares = userPortions.reduce((sum, p) => sum + (p.hectares || 0), 0);
		const userBps = userPortions.reduce((sum, p) => sum + (p.ownershipBps || 0), 0);

		return {
			...u,
			color: u.color || getMemberColor(u, idx),
			roles,
			hectares: userHectares,
			ownershipBps: userBps,
			ownershipPercentage: userBps / 100,
			portions: userPortions
		};
	});

	const totalHectares = portions
		.filter((p) => p.status === 'active')
		.reduce((sum, p) => sum + (p.hectares || 0), 0);

	const totalBps = portions
		.filter((p) => p.status === 'active')
		.reduce((sum, p) => sum + (p.ownershipBps || 0), 0);

	return {
		user: locals.user,
		users,
		portions,
		associates: associatesList,
		stats: {
			totalHectares,
			totalBps,
			totalPercentage: totalBps / 100
		}
	};
};

export const actions: Actions = {
	createUser: async ({ request, locals, platform }) => {
		if (!locals.user || !hasAnyRole(locals.user.roles, ['secretary'])) {
			return fail(403, { error: 'Unauthorized: Secretary role required.' });
		}
		if (!platform?.env?.DB) return fail(500, { error: 'Database unavailable' });

		const formData = await request.formData();
		const name = formData.get('name')?.toString().trim();
		const email = formData.get('email')?.toString().trim().toLowerCase();
		const username = formData.get('username')?.toString().trim().toLowerCase();
		const phone = formData.get('phone')?.toString().trim();
		const password = formData.get('password')?.toString();
		const roles = formData.getAll('roles').map((r) => r.toString());

		if (!name || !email || !password) {
			return fail(400, { error: 'Name, email, and password are required.' });
		}

		const db = getDb(platform.env.DB);
		const existingEmail = await db.query.user.findFirst({ where: eq(schema.user.email, email) });
		if (existingEmail) return fail(400, { error: 'A user with this email address already exists.' });

		if (username) {
			const existingUsername = await db.query.user.findFirst({ where: eq(schema.user.username, username) });
			if (existingUsername) return fail(400, { error: 'This username is already taken.' });
		}

		const id = crypto.randomUUID();
		const now = new Date();

		const allUsers = await db.query.user.findMany();
		const usedColors = new Set(allUsers.map((u) => u.color).filter(Boolean));
		const autoColor = PLO_MEMBER_PALETTE.find((c) => !usedColors.has(c)) || PLO_MEMBER_PALETTE[allUsers.length % PLO_MEMBER_PALETTE.length];

		await db.insert(schema.user).values({
			id,
			name,
			email,
			username: username || null,
			phone: phone || null,
			color: autoColor,
			roles: JSON.stringify(roles.length ? roles : ['main_plo']),
			status: 'active',
			emailVerified: false,
			createdAt: now,
			updatedAt: now
		});

		const hashedPassword = await hashPassword(password);

		await db.insert(schema.account).values({
			id: crypto.randomUUID(),
			accountId: id,
			providerId: 'credential',
			userId: id,
			password: hashedPassword,
			createdAt: now,
			updatedAt: now
		});

		await logAuditEvent(platform.env.DB, {
			userId: locals.user.id,
			userEmail: locals.user.email,
			roleAtTime: 'secretary',
			actionType: 'USER_CREATED',
			recordId: id,
			recordType: 'user',
			details: { name, email, roles }
		});

		return { success: true };
	},

	createPortion: async ({ request, locals, platform }) => {
		if (!locals.user || !hasAnyRole(locals.user.roles, ['secretary'])) {
			return fail(403, { error: 'Unauthorized: Secretary role required.' });
		}
		if (!platform?.env?.DB) return fail(500, { error: 'Database unavailable' });

		const formData = await request.formData();
		const userId = formData.get('userId')?.toString() || null;
		const portionName = formData.get('portionName')?.toString().trim();
		const hectares = parseFloat(formData.get('hectares')?.toString() || '0');
		const ownershipBps = parseInt(formData.get('ownershipBps')?.toString() || '0', 10);
		const notes = formData.get('notes')?.toString().trim() || null;

		if (!portionName || hectares <= 0 || ownershipBps <= 0) {
			return fail(400, { error: 'Valid portion name, positive hectares, and bps are required.' });
		}

		const db = getDb(platform.env.DB);
		const id = crypto.randomUUID();

		await db.insert(schema.landPortions).values({
			id,
			userId,
			portionName,
			hectares,
			ownershipBps,
			voteAllocationBps: ownershipBps,
			status: 'active',
			notes
		});

		await logAuditEvent(platform.env.DB, {
			userId: locals.user.id,
			userEmail: locals.user.email,
			roleAtTime: 'secretary',
			actionType: 'LAND_PORTION_CREATED',
			recordId: id,
			recordType: 'land_portion',
			details: { portionName, hectares, ownershipBps, userId }
		});

		return { success: true };
	},

	toggleUserStatus: async ({ request, locals, platform }) => {
		if (!locals.user || !hasAnyRole(locals.user.roles, ['secretary'])) {
			return fail(403, { error: 'Unauthorized: Secretary role required.' });
		}
		if (!platform?.env?.DB) return fail(500, { error: 'Database unavailable' });

		const formData = await request.formData();
		const targetUserId = formData.get('userId')?.toString();
		if (!targetUserId) return fail(400, { error: 'Missing target user ID' });

		const db = getDb(platform.env.DB);
		const target = await db.query.user.findFirst({ where: eq(schema.user.id, targetUserId) });
		if (!target) return fail(404, { error: 'User not found' });

		const nextStatus = target.status === 'active' ? 'archived' : 'active';
		const now = new Date();
		await db.update(schema.user).set({ status: nextStatus, updatedAt: now }).where(eq(schema.user.id, targetUserId));

		if (nextStatus === 'archived') {
			await db.delete(schema.session).where(eq(schema.session.userId, targetUserId));
			const linkedAssociates = await db.query.associates.findMany({
				where: eq(schema.associates.sponsoringMainPloUserId, targetUserId)
			});
			for (const assoc of linkedAssociates) {
				await db.update(schema.user).set({ status: 'archived', updatedAt: now }).where(eq(schema.user.id, assoc.associateUserId));
				await db.delete(schema.session).where(eq(schema.session.userId, assoc.associateUserId));
			}
		}

		await logAuditEvent(platform.env.DB, {
			userId: locals.user.id,
			userEmail: locals.user.email,
			roleAtTime: 'secretary',
			actionType: nextStatus === 'archived' ? 'USER_ARCHIVED' : 'USER_RESTORED',
			recordId: targetUserId,
			recordType: 'user',
			details: { email: target.email, previousStatus: target.status, newStatus: nextStatus }
		});

		return { success: true };
	},

	archiveUser: async ({ request, locals, platform }) => {
		if (!locals.user || !hasAnyRole(locals.user.roles, ['secretary'])) {
			return fail(403, { error: 'Unauthorized: Secretary role required.' });
		}
		if (!platform?.env?.DB) return fail(500, { error: 'Database unavailable' });

		const formData = await request.formData();
		const userId = formData.get('userId')?.toString();
		if (!userId) return fail(400, { error: 'Missing user ID.' });

		if (locals.user.id === userId) {
			return fail(400, { error: 'You cannot archive your own active Secretary account.' });
		}

		const db = getDb(platform.env.DB);
		const targetUser = await db.query.user.findFirst({ where: eq(schema.user.id, userId) });
		if (!targetUser) return fail(404, { error: 'User not found.' });

		const now = new Date();
		await db.update(schema.user).set({ status: 'archived', updatedAt: now }).where(eq(schema.user.id, userId));

		// Invalidate active sessions immediately
		await db.delete(schema.session).where(eq(schema.session.userId, userId));

		// Cascade archive to linked associates
		const linkedAssociates = await db.query.associates.findMany({
			where: eq(schema.associates.sponsoringMainPloUserId, userId)
		});
		for (const assoc of linkedAssociates) {
			await db.update(schema.user).set({ status: 'archived', updatedAt: now }).where(eq(schema.user.id, assoc.associateUserId));
			await db.delete(schema.session).where(eq(schema.session.userId, assoc.associateUserId));
		}

		await logAuditEvent(platform.env.DB, {
			userId: locals.user.id,
			userEmail: locals.user.email,
			roleAtTime: 'secretary',
			actionType: 'USER_ARCHIVED',
			recordId: userId,
			recordType: 'user',
			details: { name: targetUser.name, email: targetUser.email, previousStatus: targetUser.status }
		});

		return { success: true, message: `Landowner account for ${targetUser.name} archived.` };
	},

	restoreUser: async ({ request, locals, platform }) => {
		if (!locals.user || !hasAnyRole(locals.user.roles, ['secretary'])) {
			return fail(403, { error: 'Unauthorized: Secretary role required.' });
		}
		if (!platform?.env?.DB) return fail(500, { error: 'Database unavailable' });

		const formData = await request.formData();
		const userId = formData.get('userId')?.toString();
		if (!userId) return fail(400, { error: 'Missing user ID.' });

		const db = getDb(platform.env.DB);
		const targetUser = await db.query.user.findFirst({ where: eq(schema.user.id, userId) });
		if (!targetUser) return fail(404, { error: 'User not found.' });

		const now = new Date();
		await db.update(schema.user).set({ status: 'active', updatedAt: now }).where(eq(schema.user.id, userId));

		await logAuditEvent(platform.env.DB, {
			userId: locals.user.id,
			userEmail: locals.user.email,
			roleAtTime: 'secretary',
			actionType: 'USER_RESTORED',
			recordId: userId,
			recordType: 'user',
			details: { name: targetUser.name, email: targetUser.email, previousStatus: targetUser.status }
		});

		return { success: true, message: `Landowner account for ${targetUser.name} restored to active.` };
	},

	deleteUser: async ({ request, locals, platform }) => {
		if (!locals.user || !hasAnyRole(locals.user.roles, ['secretary'])) {
			return fail(403, { error: 'Unauthorized: Secretary role required.' });
		}
		if (!platform?.env?.DB) return fail(500, { error: 'Database unavailable' });

		const formData = await request.formData();
		const userId = formData.get('userId')?.toString();
		if (!userId) return fail(400, { error: 'Missing user ID.' });

		if (locals.user.id === userId) {
			return fail(400, { error: 'You cannot delete your own Secretary account.' });
		}

		const db = getDb(platform.env.DB);
		const targetUser = await db.query.user.findFirst({ where: eq(schema.user.id, userId) });
		if (!targetUser) return fail(404, { error: 'User not found.' });

		// STRICT GOVERNANCE RULE: Only archived users can be deleted
		if (targetUser.status !== 'archived') {
			return fail(400, { error: 'Only archived users can be deleted. Please archive this user first before attempting deletion.' });
		}

		// 1. Unassign any land portions owned by this user
		await db.update(schema.landPortions).set({ userId: null, updatedAt: new Date() }).where(eq(schema.landPortions.userId, userId));

		// 2. Clear quota trades where user is buyer or seller
		await db.delete(schema.quotaTrades).where(or(
			eq(schema.quotaTrades.sellerId, userId),
			eq(schema.quotaTrades.buyerId, userId)
		));

		// 3. Clear sessions and credentials
		await db.delete(schema.session).where(eq(schema.session.userId, userId));
		await db.delete(schema.account).where(eq(schema.account.userId, userId));

		// 4. Clear associates links
		await db.delete(schema.associates).where(or(
			eq(schema.associates.associateUserId, userId),
			eq(schema.associates.sponsoringMainPloUserId, userId)
		));

		// 5. Clear calendar, votes, quota allocations, hunting logs
		await db.delete(schema.calendarEntries).where(eq(schema.calendarEntries.userId, userId));
		await db.delete(schema.votes).where(eq(schema.votes.userId, userId));
		await db.delete(schema.quotaAllocations).where(eq(schema.quotaAllocations.userId, userId));
		await db.delete(schema.huntingLogs).where(eq(schema.huntingLogs.userId, userId));

		// 6. Delete user record
		await db.delete(schema.user).where(eq(schema.user.id, userId));

		// 7. Log audit event
		await logAuditEvent(platform.env.DB, {
			userId: locals.user.id,
			userEmail: locals.user.email,
			roleAtTime: 'secretary',
			actionType: 'USER_DELETED',
			recordId: userId,
			recordType: 'user',
			details: { name: targetUser.name, email: targetUser.email }
		});

		return { success: true, message: `User record for ${targetUser.name} permanently deleted.` };
	},

	archivePortion: async ({ request, locals, platform }) => {
		if (!locals.user || !hasAnyRole(locals.user.roles, ['secretary'])) {
			return fail(403, { error: 'Unauthorized: Secretary role required.' });
		}
		if (!platform?.env?.DB) return fail(500, { error: 'Database unavailable' });

		const formData = await request.formData();
		const portionId = formData.get('portionId')?.toString();
		if (!portionId) return fail(400, { error: 'Missing portion ID.' });

		const db = getDb(platform.env.DB);
		const portion = await db.query.landPortions.findFirst({ where: eq(schema.landPortions.id, portionId) });
		if (!portion) return fail(404, { error: 'Land portion not found.' });

		const now = new Date();
		await db.update(schema.landPortions).set({ status: 'archived', updatedAt: now }).where(eq(schema.landPortions.id, portionId));

		await logAuditEvent(platform.env.DB, {
			userId: locals.user.id,
			userEmail: locals.user.email,
			roleAtTime: 'secretary',
			actionType: 'LAND_PORTION_ARCHIVED',
			recordId: portionId,
			recordType: 'land_portion',
			details: { portionName: portion.portionName, hectares: portion.hectares, ownershipBps: portion.ownershipBps, previousStatus: portion.status }
		});

		return { success: true, message: `Cadastral portion "${portion.portionName}" archived.` };
	},

	restorePortion: async ({ request, locals, platform }) => {
		if (!locals.user || !hasAnyRole(locals.user.roles, ['secretary'])) {
			return fail(403, { error: 'Unauthorized: Secretary role required.' });
		}
		if (!platform?.env?.DB) return fail(500, { error: 'Database unavailable' });

		const formData = await request.formData();
		const portionId = formData.get('portionId')?.toString();
		if (!portionId) return fail(400, { error: 'Missing portion ID.' });

		const db = getDb(platform.env.DB);
		const portion = await db.query.landPortions.findFirst({ where: eq(schema.landPortions.id, portionId) });
		if (!portion) return fail(404, { error: 'Land portion not found.' });

		const now = new Date();
		await db.update(schema.landPortions).set({ status: 'active', updatedAt: now }).where(eq(schema.landPortions.id, portionId));

		await logAuditEvent(platform.env.DB, {
			userId: locals.user.id,
			userEmail: locals.user.email,
			roleAtTime: 'secretary',
			actionType: 'LAND_PORTION_RESTORED',
			recordId: portionId,
			recordType: 'land_portion',
			details: { portionName: portion.portionName, hectares: portion.hectares, ownershipBps: portion.ownershipBps }
		});

		return { success: true, message: `Cadastral portion "${portion.portionName}" restored to active status.` };
	},

	deletePortion: async ({ request, locals, platform }) => {
		if (!locals.user || !hasAnyRole(locals.user.roles, ['secretary'])) {
			return fail(403, { error: 'Unauthorized: Secretary role required.' });
		}
		if (!platform?.env?.DB) return fail(500, { error: 'Database unavailable' });

		const formData = await request.formData();
		const portionId = formData.get('portionId')?.toString();
		if (!portionId) return fail(400, { error: 'Missing portion ID.' });

		const db = getDb(platform.env.DB);
		const portion = await db.query.landPortions.findFirst({ where: eq(schema.landPortions.id, portionId) });
		if (!portion) return fail(404, { error: 'Land portion not found.' });

		// STRICT GOVERNANCE RULE: Only archived portions can be deleted
		if (portion.status !== 'archived') {
			return fail(400, { error: 'Only archived land portions can be deleted. Please archive this portion first before attempting deletion.' });
		}

		await db.delete(schema.landPortions).where(eq(schema.landPortions.id, portionId));

		await logAuditEvent(platform.env.DB, {
			userId: locals.user.id,
			userEmail: locals.user.email,
			roleAtTime: 'secretary',
			actionType: 'LAND_PORTION_DELETED',
			recordId: portionId,
			recordType: 'land_portion',
			details: { portionName: portion.portionName, hectares: portion.hectares, ownershipBps: portion.ownershipBps, userId: portion.userId }
		});

		return { success: true, message: `Cadastral portion "${portion.portionName}" permanently deleted.` };
	},

	updateUser: async ({ request, locals, platform }) => {
		if (!locals.user || !hasAnyRole(locals.user.roles, ['secretary'])) {
			return fail(403, { error: 'Unauthorized: Secretary role required.' });
		}
		if (!platform?.env?.DB) return fail(500, { error: 'Database unavailable' });

		const formData = await request.formData();
		const userId = formData.get('userId')?.toString();
		const name = formData.get('name')?.toString().trim();
		const email = formData.get('email')?.toString().trim().toLowerCase();
		const username = formData.get('username')?.toString().trim().toLowerCase() || null;
		const phone = formData.get('phone')?.toString().trim() || null;
		const password = formData.get('password')?.toString();
		const color = formData.get('color')?.toString().trim();
		const status = formData.get('status')?.toString() || 'active';
		const roles = formData.getAll('roles').map((r) => r.toString());

		if (!userId || !name || !email) {
			return fail(400, { error: 'User ID, name, and email are required.' });
		}

		const db = getDb(platform.env.DB);
		const existingUser = await db.query.user.findFirst({ where: eq(schema.user.id, userId) });
		if (!existingUser) return fail(404, { error: 'User not found.' });

		if (email !== existingUser.email) {
			const emailConflict = await db.query.user.findFirst({ where: eq(schema.user.email, email) });
			if (emailConflict) return fail(400, { error: 'A user with this email address already exists.' });
		}

		if (username && username !== existingUser.username) {
			const usernameConflict = await db.query.user.findFirst({ where: eq(schema.user.username, username) });
			if (usernameConflict) return fail(400, { error: 'This username is already taken.' });
		}

		const now = new Date();
		const finalRoles = roles.length ? roles : ['main_plo'];

		await db.update(schema.user).set({
			name,
			email,
			username,
			phone,
			color: color || existingUser.color || getMemberColor(existingUser),
			status,
			roles: JSON.stringify(finalRoles),
			updatedAt: now
		}).where(eq(schema.user.id, userId));

		if (password && password.trim().length > 0) {
			const hashedPassword = await hashPassword(password);
			const existingAccount = await db.query.account.findFirst({
				where: and(
					eq(schema.account.userId, userId),
					eq(schema.account.providerId, 'credential')
				)
			});

			if (existingAccount) {
				await db.update(schema.account).set({
					password: hashedPassword,
					updatedAt: now
				}).where(eq(schema.account.id, existingAccount.id));
			} else {
				await db.insert(schema.account).values({
					id: crypto.randomUUID(),
					accountId: userId,
					providerId: 'credential',
					userId,
					password: hashedPassword,
					createdAt: now,
					updatedAt: now
				});
			}
		}

		if (status === 'archived' && existingUser.status !== 'archived') {
			await db.delete(schema.session).where(eq(schema.session.userId, userId));
			const linkedAssociates = await db.query.associates.findMany({
				where: eq(schema.associates.sponsoringMainPloUserId, userId)
			});
			for (const assoc of linkedAssociates) {
				await db.update(schema.user).set({ status: 'archived', updatedAt: now }).where(eq(schema.user.id, assoc.associateUserId));
				await db.delete(schema.session).where(eq(schema.session.userId, assoc.associateUserId));
			}
		} else if (status === 'inactive' && existingUser.status !== 'inactive') {
			const linkedAssociates = await db.query.associates.findMany({
				where: eq(schema.associates.sponsoringMainPloUserId, userId)
			});
			for (const assoc of linkedAssociates) {
				await db.update(schema.user).set({ status: 'inactive', updatedAt: now }).where(eq(schema.user.id, assoc.associateUserId));
			}
		}

		await logAuditEvent(platform.env.DB, {
			userId: locals.user.id,
			userEmail: locals.user.email,
			roleAtTime: 'secretary',
			actionType: 'USER_UPDATED',
			recordId: userId,
			recordType: 'user',
			details: { name, email, username, roles: finalRoles, status, passwordUpdated: Boolean(password && password.trim().length > 0) }
		});

		return { success: true };
	},

	updatePortion: async ({ request, locals, platform }) => {
		if (!locals.user || !hasAnyRole(locals.user.roles, ['secretary'])) {
			return fail(403, { error: 'Unauthorized: Secretary role required.' });
		}
		if (!platform?.env?.DB) return fail(500, { error: 'Database unavailable' });

		const formData = await request.formData();
		const portionId = formData.get('portionId')?.toString();
		const userId = formData.get('userId')?.toString() || null;
		const portionName = formData.get('portionName')?.toString().trim();
		const hectares = parseFloat(formData.get('hectares')?.toString() || '0');
		const ownershipBps = parseInt(formData.get('ownershipBps')?.toString() || '0', 10);
		const status = formData.get('status')?.toString() || 'active';
		const notes = formData.get('notes')?.toString().trim() || null;

		if (!portionId || !portionName || hectares <= 0 || ownershipBps <= 0) {
			return fail(400, { error: 'Valid portion ID, portion name, positive hectares, and bps are required.' });
		}

		const db = getDb(platform.env.DB);
		const existingPortion = await db.query.landPortions.findFirst({
			where: eq(schema.landPortions.id, portionId)
		});
		if (!existingPortion) return fail(404, { error: 'Land portion not found.' });

		const now = new Date();

		await db.update(schema.landPortions).set({
			userId,
			portionName,
			hectares,
			ownershipBps,
			voteAllocationBps: ownershipBps,
			status,
			notes,
			updatedAt: now
		}).where(eq(schema.landPortions.id, portionId));

		await logAuditEvent(platform.env.DB, {
			userId: locals.user.id,
			userEmail: locals.user.email,
			roleAtTime: 'secretary',
			actionType: 'LAND_PORTION_UPDATED',
			recordId: portionId,
			recordType: 'land_portion',
			details: { portionName, hectares, ownershipBps, userId, status }
		});

		return { success: true };
	}
};
