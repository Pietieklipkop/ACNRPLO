import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { getDb, schema } from '$lib/server/db';
import { eq, and } from 'drizzle-orm';
import { hashPassword } from 'better-auth/crypto';
import { logAuditEvent } from '$lib/server/audit';
import { PLO_MEMBER_PALETTE } from '$lib/constants/member-colors';

export const load: PageServerLoad = async ({ url, platform }) => {
	const token = url.searchParams.get('token')?.trim();

	if (!token) {
		return {
			valid: false,
			error: 'No invitation token was provided. Please check the link from your email.'
		};
	}

	if (!platform?.env?.DB) {
		return {
			valid: false,
			error: 'Database service is temporarily unavailable.'
		};
	}

	const db = getDb(platform.env.DB);

	const invite = await db.query.invitations.findFirst({
		where: eq(schema.invitations.token, token),
		with: {
			sponsorUser: true
		}
	});

	if (!invite) {
		return {
			valid: false,
			error: 'This invitation link is invalid or does not exist.'
		};
	}

	if (invite.status === 'accepted') {
		return {
			valid: false,
			error: 'This invitation has already been accepted and your password has been set.',
			alreadyAccepted: true,
			email: invite.email
		};
	}

	if (invite.status === 'revoked') {
		return {
			valid: false,
			error: 'This invitation was revoked by the sponsoring member.'
		};
	}

	if (invite.expiresAt < new Date()) {
		try {
			await db.update(schema.invitations).set({ status: 'expired' }).where(eq(schema.invitations.id, invite.id));
		} catch {}
		return {
			valid: false,
			error: 'This invitation link has expired. Please ask your sponsoring member for a new invitation.'
		};
	}

	// Fetch sponsor's primary cadastral land portion
	const portion = await db.query.landPortions.findFirst({
		where: eq(schema.landPortions.userId, invite.sponsoringMainPloUserId)
	});

	return {
		valid: true,
		token,
		email: invite.email,
		name: invite.name || '',
		relationship: invite.relationship,
		sponsorName: invite.sponsorUser?.name || 'Main PLO Member',
		portionName: portion?.portionName || null
	};
};

export const actions: Actions = {
	default: async ({ request, platform }) => {
		const formData = await request.formData();
		const token = formData.get('token')?.toString().trim() || '';
		const name = formData.get('name')?.toString().trim() || '';
		const password = formData.get('password')?.toString() || '';
		const confirmPassword = formData.get('confirmPassword')?.toString() || '';

		if (!token) {
			return fail(400, { error: 'Invitation token is missing.' });
		}

		if (!password || !confirmPassword) {
			return fail(400, { error: 'Please enter and confirm your new password.' });
		}

		if (password !== confirmPassword) {
			return fail(400, { error: 'Passwords do not match. Please verify both fields.' });
		}

		if (password.length < 8) {
			return fail(400, { error: 'Password must be at least 8 characters long.' });
		}

		if (!platform?.env?.DB) {
			return fail(500, { error: 'Database service is unavailable.' });
		}

		const db = getDb(platform.env.DB);

		const invite = await db.query.invitations.findFirst({
			where: eq(schema.invitations.token, token)
		});

		if (!invite) {
			return fail(404, { error: 'Invitation not found.' });
		}

		if (invite.status !== 'pending' || invite.expiresAt < new Date()) {
			return fail(400, { error: 'This invitation is no longer pending or has expired.' });
		}

		const now = new Date();
		const hashedPassword = await hashPassword(password);
		const normalizedEmail = invite.email.toLowerCase();

		// Check if user account already exists in user table
		const existingUser = await db.query.user.findFirst({
			where: eq(schema.user.email, normalizedEmail)
		});

		let userId = existingUser?.id;

		if (!existingUser) {
			userId = crypto.randomUUID();
			const allUsers = await db.query.user.findMany();
			const usedColors = new Set(allUsers.map((u) => u.color).filter(Boolean));
			const autoColor =
				PLO_MEMBER_PALETTE.find((c) => !usedColors.has(c)) ||
				PLO_MEMBER_PALETTE[allUsers.length % PLO_MEMBER_PALETTE.length];

			const cleanName = name || invite.name || normalizedEmail.split('@')[0];
			const baseUsername = normalizedEmail.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');

			const usernameConflict = await db.query.user.findFirst({
				where: eq(schema.user.username, baseUsername)
			});
			const finalUsername = usernameConflict ? `${baseUsername}_${userId.slice(0, 4)}` : baseUsername;

			await db.insert(schema.user).values({
				id: userId,
				name: cleanName,
				email: normalizedEmail,
				username: finalUsername,
				roles: JSON.stringify(['associate']),
				status: 'active',
				emailVerified: true,
				color: autoColor,
				createdAt: now,
				updatedAt: now
			});

			await db.insert(schema.account).values({
				id: crypto.randomUUID(),
				accountId: userId,
				providerId: 'credential',
				userId,
				password: hashedPassword,
				createdAt: now,
				updatedAt: now
			});
		} else {
			// User exists - update their password and ensure associate role
			userId = existingUser.id;
			let userRoles: string[] = [];
			try {
				userRoles = JSON.parse(existingUser.roles || '[]');
			} catch {
				userRoles = [];
			}

			if (!userRoles.includes('associate') && !userRoles.includes('main_plo') && !userRoles.includes('secretary')) {
				userRoles.push('associate');
			}

			await db
				.update(schema.user)
				.set({
					name: name || existingUser.name,
					roles: JSON.stringify(userRoles.length ? userRoles : ['associate']),
					status: 'active',
					emailVerified: true,
					updatedAt: now
				})
				.where(eq(schema.user.id, userId));

			const existingAccount = await db.query.account.findFirst({
				where: and(eq(schema.account.userId, userId), eq(schema.account.providerId, 'credential'))
			});

			if (existingAccount) {
				await db
					.update(schema.account)
					.set({
						password: hashedPassword,
						updatedAt: now
					})
					.where(eq(schema.account.id, existingAccount.id));
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

		// Ensure associate record is created linking this user to the sponsoring Main PLO member
		const existingAssociate = await db.query.associates.findFirst({
			where: and(
				eq(schema.associates.associateUserId, userId),
				eq(schema.associates.sponsoringMainPloUserId, invite.sponsoringMainPloUserId)
			)
		});

		if (!existingAssociate) {
			await db.insert(schema.associates).values({
				id: crypto.randomUUID(),
				associateUserId: userId,
				sponsoringMainPloUserId: invite.sponsoringMainPloUserId,
				relationship: invite.relationship || 'family',
				createdAt: now
			});
		} else {
			await db
				.update(schema.associates)
				.set({
					relationship: invite.relationship || 'family'
				})
				.where(eq(schema.associates.id, existingAssociate.id));
		}

		// Mark invitation as accepted
		await db
			.update(schema.invitations)
			.set({
				status: 'accepted',
				acceptedAt: now
			})
			.where(eq(schema.invitations.id, invite.id));

		// Audit log
		await logAuditEvent(platform.env.DB, {
			userId,
			userEmail: normalizedEmail,
			roleAtTime: 'associate',
			actionType: 'ASSOCIATE_INVITATION_ACCEPTED',
			recordId: invite.id,
			recordType: 'invitations',
			details: {
				sponsorId: invite.sponsoringMainPloUserId,
				relationship: invite.relationship
			}
		});

		// Redirect to login with confirmation
		throw redirect(303, `/login?registered=1&email=${encodeURIComponent(normalizedEmail)}`);
	}
};
