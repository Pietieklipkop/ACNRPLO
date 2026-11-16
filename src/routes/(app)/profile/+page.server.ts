import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { getDb, schema } from '$lib/server/db';
import { eq, and, desc } from 'drizzle-orm';
import { logAuditEvent } from '$lib/server/audit';
import { sendInviteEmail } from '$lib/server/email';

export const load: PageServerLoad = async ({ locals, platform }) => {
	if (!locals.user) {
		throw redirect(303, '/login');
	}

	const currentUser = locals.user;

	if (!platform?.env?.DB) {
		return {
			user: currentUser,
			fullUser: null,
			portions: [],
			stats: {
				totalHectares: 0,
				totalPercentage: currentUser.ownershipPercentage || 0,
				totalVoteBps: currentUser.voteWeightBps || 0
			},
			recentVisits: [],
			canInvite: false,
			associates: [],
			pendingInvitations: [],
			sponsor: null
		};
	}

	const db = getDb(platform.env.DB);
	const isMainPlo = currentUser.roles.includes('main_plo');
	const isSecretary = currentUser.roles.includes('secretary');
	const isAssociate = currentUser.roles.includes('associate');
	const canInvite = isMainPlo || isSecretary;

	// Load user record, portions, and visits
	const [fullUser, portions, recentVisits] = await Promise.all([
		db.query.user.findFirst({
			where: eq(schema.user.id, currentUser.id)
		}),
		db.query.landPortions.findMany({
			where: eq(schema.landPortions.userId, currentUser.id),
			orderBy: [desc(schema.landPortions.ownershipBps)]
		}),
		db.query.calendarEntries.findMany({
			where: eq(schema.calendarEntries.userId, currentUser.id),
			orderBy: [desc(schema.calendarEntries.startDate)],
			limit: 5
		})
	]);

	// Load associates & pending invitations if canInvite
	let linkedAssociates: any[] = [];
	let pendingInvitations: any[] = [];
	let sponsorInfo: any = null;

	if (canInvite) {
		const [rawAssociates, rawInvitations] = await Promise.all([
			db.query.associates.findMany({
				where: eq(schema.associates.sponsoringMainPloUserId, currentUser.id),
				with: {
					associateUser: true
				}
			}),
			db.query.invitations.findMany({
				where: and(
					eq(schema.invitations.sponsoringMainPloUserId, currentUser.id),
					eq(schema.invitations.status, 'pending')
				),
				orderBy: [desc(schema.invitations.createdAt)]
			})
		]);

		linkedAssociates = rawAssociates.map((a) => ({
			id: a.id,
			relationship: a.relationship,
			createdAt: a.createdAt,
			user: a.associateUser
				? {
						id: a.associateUser.id,
						name: a.associateUser.name,
						email: a.associateUser.email,
						status: a.associateUser.status,
						color: a.associateUser.color
				  }
				: null
		}));

		pendingInvitations = rawInvitations.map((inv) => ({
			id: inv.id,
			email: inv.email,
			name: inv.name,
			relationship: inv.relationship,
			token: inv.token,
			status: inv.status,
			expiresAt: inv.expiresAt,
			createdAt: inv.createdAt
		}));
	}

	// If current user is an Associate member, find their sponsoring Main PLO member
	if (isAssociate) {
		const assocRecord = await db.query.associates.findFirst({
			where: eq(schema.associates.associateUserId, currentUser.id),
			with: {
				sponsorUser: true
			}
		});

		if (assocRecord?.sponsoringMainPloUserId) {
			const sponsorPortion = await db.query.landPortions.findFirst({
				where: eq(schema.landPortions.userId, assocRecord.sponsoringMainPloUserId)
			});

			sponsorInfo = {
				name: assocRecord.sponsorUser?.name || 'Main PLO Member',
				email: assocRecord.sponsorUser?.email || '',
				relationship: assocRecord.relationship,
				portionName: sponsorPortion?.portionName || null
			};
		}
	}

	const totalHectares = portions.reduce((sum, p) => sum + (p.hectares || 0), 0);
	const totalBps = portions.reduce((sum, p) => sum + (p.ownershipBps || 0), 0);
	const totalVoteBps = portions.reduce((sum, p) => sum + (p.voteAllocationBps || 0), 0);

	return {
		user: currentUser,
		fullUser: fullUser
			? {
					id: fullUser.id,
					name: fullUser.name,
					email: fullUser.email,
					username: fullUser.username,
					status: fullUser.status,
					roles: currentUser.roles,
					createdAt: fullUser.createdAt
			  }
			: null,
		portions,
		stats: {
			totalHectares,
			totalPercentage: totalBps / 100,
			totalVoteBps
		},
		recentVisits,
		canInvite,
		associates: linkedAssociates,
		pendingInvitations,
		sponsor: sponsorInfo
	};
};

export const actions: Actions = {
	inviteMember: async ({ request, locals, platform, url }) => {
		if (!locals.user) {
			return fail(401, { error: 'Authentication required.' });
		}

		const canInvite = locals.user.roles.includes('main_plo') || locals.user.roles.includes('secretary');
		if (!canInvite) {
			return fail(403, { error: 'Only Main PLO members can invite members to their profile.' });
		}

		if (!platform?.env?.DB) {
			return fail(500, { error: 'Database service is unavailable.' });
		}

		const formData = await request.formData();
		const rawEmail = formData.get('email')?.toString().trim() || '';
		const name = formData.get('name')?.toString().trim() || '';
		const relationship = formData.get('relationship')?.toString().trim() || 'family';

		if (!rawEmail) {
			return fail(400, { error: 'Please enter a valid email address.' });
		}

		const email = rawEmail.toLowerCase();
		const validRelationships = ['family', 'co_owner', 'delegate'];
		if (!validRelationships.includes(relationship)) {
			return fail(400, { error: 'Invalid relationship role. Choose Family Member, Co-Owner, or Authorised Delegate.' });
		}
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(email)) {
			return fail(400, { error: 'Please enter a valid email format (e.g. member@example.com).' });
		}

		if (email === locals.user.email.toLowerCase()) {
			return fail(400, { error: 'You cannot invite your own email address to your profile.' });
		}

		const db = getDb(platform.env.DB);

		// Check if user already exists
		const existingUser = await db.query.user.findFirst({
			where: eq(schema.user.email, email)
		});

		if (existingUser) {
			// Check if already an associate of this sponsor
			const existingAssociate = await db.query.associates.findFirst({
				where: and(
					eq(schema.associates.associateUserId, existingUser.id),
					eq(schema.associates.sponsoringMainPloUserId, locals.user.id)
				)
			});

			if (existingAssociate) {
				return fail(400, { error: 'This person is already an active member linked to your profile.' });
			}

			// If the user is the secretary
			let existingRoles: string[] = [];
			try {
				existingRoles = JSON.parse(existingUser.roles || '[]');
			} catch {}

			if (existingRoles.includes('secretary')) {
				return fail(400, { error: 'The Reserve Secretary cannot be added as an associate.' });
			}
		}

		// Find primary portion name for email context
		const primaryPortion = await db.query.landPortions.findFirst({
			where: eq(schema.landPortions.userId, locals.user.id)
		});

		const token = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '');
		const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

		// Check if an existing pending invitation exists for this sponsor and email
		const existingInvitation = await db.query.invitations.findFirst({
			where: and(
				eq(schema.invitations.email, email),
				eq(schema.invitations.sponsoringMainPloUserId, locals.user.id),
				eq(schema.invitations.status, 'pending')
			)
		});

		let inviteId: string;

		if (existingInvitation) {
			inviteId = existingInvitation.id;
			await db
				.update(schema.invitations)
				.set({
					name: name || existingInvitation.name,
					relationship: relationship || existingInvitation.relationship,
					token,
					expiresAt
				})
				.where(eq(schema.invitations.id, inviteId));
		} else {
			inviteId = crypto.randomUUID();
			await db.insert(schema.invitations).values({
				id: inviteId,
				email,
				name: name || null,
				relationship,
				sponsoringMainPloUserId: locals.user.id,
				token,
				status: 'pending',
				expiresAt,
				createdAt: new Date()
			});
		}

		const inviteUrl = `${url.origin}/set-password?token=${token}`;

		// Dispatch email via Cloudflare Email Sending
		const sendResult = await sendInviteEmail(platform, {
			toEmail: email,
			inviteeName: name || null,
			sponsorName: locals.user.name,
			sponsorEmail: locals.user.email,
			portionName: primaryPortion?.portionName || null,
			relationship,
			inviteUrl
		});

		if (!sendResult.success) {
			return fail(500, {
				error: `Could not send invitation email: ${sendResult.error || 'Cloudflare Email Service failed.'}`
			});
		}

		// Record audit log event
		await logAuditEvent(platform.env.DB, {
			userId: locals.user.id,
			userEmail: locals.user.email,
			roleAtTime: locals.user.roles.join(','),
			actionType: 'ASSOCIATE_INVITATION_SENT',
			recordId: inviteId,
			recordType: 'invitations',
			details: {
				inviteeEmail: email,
				inviteeName: name,
				relationship,
				portion: primaryPortion?.portionName,
				simulated: sendResult.simulated
			}
		});

		return {
			success: true,
			message: `Invitation successfully sent to ${email}. They have been emailed a link to set their password.`
		};
	},

	resendInvite: async ({ request, locals, platform, url }) => {
		if (!locals.user) {
			return fail(401, { error: 'Authentication required.' });
		}

		const canInvite = locals.user.roles.includes('main_plo') || locals.user.roles.includes('secretary');
		if (!canInvite) {
			return fail(403, { error: 'Unauthorized.' });
		}

		if (!platform?.env?.DB) {
			return fail(500, { error: 'Database service is unavailable.' });
		}

		const formData = await request.formData();
		const id = formData.get('id')?.toString().trim() || '';

		if (!id) {
			return fail(400, { error: 'Invitation ID is required.' });
		}

		const db = getDb(platform.env.DB);
		const invite = await db.query.invitations.findFirst({
			where: and(
				eq(schema.invitations.id, id),
				eq(schema.invitations.sponsoringMainPloUserId, locals.user.id),
				eq(schema.invitations.status, 'pending')
			)
		});

		if (!invite) {
			return fail(404, { error: 'Pending invitation not found.' });
		}

		const token = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '');
		const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

		await db
			.update(schema.invitations)
			.set({
				token,
				expiresAt
			})
			.where(eq(schema.invitations.id, id));

		const primaryPortion = await db.query.landPortions.findFirst({
			where: eq(schema.landPortions.userId, locals.user.id)
		});

		const inviteUrl = `${url.origin}/set-password?token=${token}`;

		const sendResult = await sendInviteEmail(platform, {
			toEmail: invite.email,
			inviteeName: invite.name,
			sponsorName: locals.user.name,
			sponsorEmail: locals.user.email,
			portionName: primaryPortion?.portionName || null,
			relationship: invite.relationship,
			inviteUrl
		});

		if (!sendResult.success) {
			return fail(500, {
				error: `Could not resend email: ${sendResult.error || 'Cloudflare Email Service failed.'}`
			});
		}

		return {
			success: true,
			message: `Invitation email resent to ${invite.email}.`
		};
	},

	revokeInvite: async ({ request, locals, platform }) => {
		if (!locals.user) {
			return fail(401, { error: 'Authentication required.' });
		}

		const canInvite = locals.user.roles.includes('main_plo') || locals.user.roles.includes('secretary');
		if (!canInvite) {
			return fail(403, { error: 'Unauthorized.' });
		}

		if (!platform?.env?.DB) {
			return fail(500, { error: 'Database service is unavailable.' });
		}

		const formData = await request.formData();
		const id = formData.get('id')?.toString().trim() || '';

		if (!id) {
			return fail(400, { error: 'Invitation ID is required.' });
		}

		const db = getDb(platform.env.DB);
		const invite = await db.query.invitations.findFirst({
			where: and(
				eq(schema.invitations.id, id),
				eq(schema.invitations.sponsoringMainPloUserId, locals.user.id)
			)
		});

		if (!invite) {
			return fail(404, { error: 'Invitation not found.' });
		}

		await db
			.update(schema.invitations)
			.set({
				status: 'revoked'
			})
			.where(eq(schema.invitations.id, id));

		await logAuditEvent(platform.env.DB, {
			userId: locals.user.id,
			userEmail: locals.user.email,
			roleAtTime: locals.user.roles.join(','),
			actionType: 'ASSOCIATE_INVITATION_REVOKED',
			recordId: id,
			recordType: 'invitations',
			details: { revokedEmail: invite.email }
		});

		return {
			success: true,
			message: `Invitation for ${invite.email} has been revoked.`
		};
	},

	removeAssociate: async ({ request, locals, platform }) => {
		if (!locals.user) {
			return fail(401, { error: 'Authentication required.' });
		}

		const canManage = locals.user.roles.includes('main_plo') || locals.user.roles.includes('secretary');
		if (!canManage) {
			return fail(403, { error: 'Unauthorized.' });
		}

		if (!platform?.env?.DB) {
			return fail(500, { error: 'Database service is unavailable.' });
		}

		const formData = await request.formData();
		const associateId = formData.get('associateId')?.toString().trim() || '';

		if (!associateId) {
			return fail(400, { error: 'Associate ID is required.' });
		}

		const db = getDb(platform.env.DB);
		const assoc = await db.query.associates.findFirst({
			where: eq(schema.associates.id, associateId),
			with: {
				associateUser: true
			}
		});

		if (!assoc) {
			return fail(404, { error: 'Linked associate record not found.' });
		}

		if (!locals.user.roles.includes('secretary') && assoc.sponsoringMainPloUserId !== locals.user.id) {
			return fail(403, { error: 'You can only remove associates linked to your own profile.' });
		}

		await db.delete(schema.associates).where(eq(schema.associates.id, associateId));

		// Check if this associate user has any other active associations
		const otherAssocs = await db.query.associates.findMany({
			where: eq(schema.associates.associateUserId, assoc.associateUserId)
		});

		// If no other associations and they are an associate-only user, disable account and purge active sessions
		if (otherAssocs.length === 0) {
			const assocUser = await db.query.user.findFirst({
				where: eq(schema.user.id, assoc.associateUserId)
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
						.where(eq(schema.user.id, assoc.associateUserId));

					await db
						.delete(schema.session)
						.where(eq(schema.session.userId, assoc.associateUserId));
				}
			}
		}

		await logAuditEvent(platform.env.DB, {
			userId: locals.user.id,
			userEmail: locals.user.email,
			roleAtTime: locals.user.roles.join(','),
			actionType: 'ASSOCIATE_REMOVED',
			recordId: associateId,
			recordType: 'associates',
			details: {
				removedUserId: assoc.associateUserId,
				removedUserEmail: assoc.associateUser?.email
			}
		});

		return {
			success: true,
			message: `Member ${assoc.associateUser?.name || ''} has been removed from your profile.`
		};
	}
};
