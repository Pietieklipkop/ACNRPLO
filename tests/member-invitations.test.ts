import { describe, it, expect, vi } from 'vitest';
import {
	generateInviteEmailHtml,
	generateInviteEmailText,
	sendInviteEmail,
	escapeHtml
} from '$lib/server/email';
import { canVote, canBookCalendar } from '$lib/auth/roles';

describe('Cloudflare Email Service & Member Invitations', () => {
	const mockPayload = {
		toEmail: 'newassociate@example.com',
		inviteeName: 'Karel van der Merwe',
		sponsorName: 'Willem Fourie (Main PLO)',
		sponsorEmail: 'willem@scholtzrad.co.za',
		portionName: 'Groengoud',
		relationship: 'family',
		inviteUrl: 'https://acnrplo.dialogdev.net/set-password?token=test-secure-token-12345'
	};

	describe('Email Content Generation', () => {
		it('generates HTML email containing sponsor, portion, and invite link from dialogdev.net', () => {
			const html = generateInviteEmailHtml(mockPayload);

			expect(html).toContain('Willem Fourie (Main PLO)');
			expect(html).toContain('Groengoud');
			expect(html).toContain('Karel van der Merwe');
			expect(html).toContain('https://acnrplo.dialogdev.net/set-password?token=test-secure-token-12345');
			expect(html).toContain('dialogdev.net');
			expect(html).toContain('Set Password &amp; Join Profile');
			expect(html).toContain('Associate Member');
			expect(html).toContain('7 days');
		});

		it('escapes special characters safely in HTML templates', () => {
			const unsafePayload = {
				...mockPayload,
				inviteeName: '<script>alert("hack")</script>',
				sponsorName: 'O\'Connor & Sons <admin@test>'
			};
			const html = generateInviteEmailHtml(unsafePayload);

			expect(html).not.toContain('<script>');
			expect(html).toContain('&lt;script&gt;alert(&quot;hack&quot;)&lt;/script&gt;');
			expect(html).toContain('O&#039;Connor &amp; Sons');
		});

		it('generates plain-text fallback with all required details', () => {
			const text = generateInviteEmailText(mockPayload);

			expect(text).toContain('Willem Fourie (Main PLO)');
			expect(text).toContain('Groengoud');
			expect(text).toContain('https://acnrplo.dialogdev.net/set-password?token=test-secure-token-12345');
			expect(text).toContain('dialogdev.net');
			expect(text).toContain('valid for 7 days');
		});
	});

	describe('Cloudflare Email Service Dispatcher', () => {
		it('dispatches email via Cloudflare Workers send_email binding when available', async () => {
			const sendMock = vi.fn().mockResolvedValue({ messageId: 'msg-cf-789' });

			const mockPlatform = {
				env: {
					EMAIL: { send: sendMock },
					SENDER_EMAIL: 'invitations@dialogdev.net',
					DB: {} as any
				},
				ctx: {} as any,
				caches: {} as any
			} as unknown as App.Platform;

			const result = await sendInviteEmail(mockPlatform, mockPayload);

			expect(result.success).toBe(true);
			expect(result.messageId).toBe('msg-cf-789');
			expect(sendMock).toHaveBeenCalledTimes(1);

			const callArgs = sendMock.mock.calls[0][0];
			expect(callArgs.to).toBe('newassociate@example.com');
			expect(callArgs.from).toEqual({
				email: 'invitations@dialogdev.net',
				name: 'ACNRPLO Reserve'
			});
			expect(callArgs.replyTo).toEqual({
				email: 'willem@scholtzrad.co.za',
				name: 'Willem Fourie (Main PLO)'
			});
			expect(callArgs.subject).toContain('Willem Fourie');
			expect(callArgs.html).toContain(mockPayload.inviteUrl);
			expect(callArgs.text).toContain(mockPayload.inviteUrl);
		});

		it('supports SEND_EMAIL binding name and string fallback', async () => {
			const sendMock = vi.fn().mockRejectedValueOnce(new Error('Object format not accepted'))
				.mockResolvedValueOnce({ messageId: 'msg-retry-ok' });

			const mockPlatform = {
				env: {
					SEND_EMAIL: { send: sendMock },
					SENDER_EMAIL: 'acnrplo@dialogdev.net',
					DB: {} as any
				},
				ctx: {} as any,
				caches: {} as any
			} as unknown as App.Platform;

			const result = await sendInviteEmail(mockPlatform, mockPayload);

			expect(result.success).toBe(true);
			expect(result.messageId).toBe('msg-retry-ok');
			expect(sendMock).toHaveBeenCalledTimes(2);

			// Second attempt passed string 'from'
			expect(sendMock.mock.calls[1][0].from).toBe('acnrplo@dialogdev.net');
		});

		it('falls back to local simulation when running outside Cloudflare Workers runtime', async () => {
			const result = await sendInviteEmail(undefined, mockPayload);

			expect(result.success).toBe(true);
			expect(result.simulated).toBe(true);
			expect(result.messageId).toMatch(/^simulated-/);
		});
	});

	describe('Security & Expiration Helpers', () => {
		it('escapeHtml correctly escapes HTML entities', () => {
			expect(escapeHtml('&<>"\'')).toBe('&amp;&lt;&gt;&quot;&#039;');
		});

		it('hashes passwords securely and verifies credentials for invited members', async () => {
			const { hashPassword, verifyPassword } = await import('better-auth/crypto');

			const newPassword = 'SecureBushveld2026!';
			const hashedPassword = await hashPassword(newPassword);

			expect(hashedPassword).toBeDefined();
			expect(hashedPassword).not.toBe(newPassword);

			const isValid = await verifyPassword({
				hash: hashedPassword,
				password: newPassword
			});
			expect(isValid).toBe(true);

			const isInvalid = await verifyPassword({
				hash: hashedPassword,
				password: 'WrongPassword@123'
			});
			expect(isInvalid).toBe(false);
		});

		it('enforces associate member role restrictions under sponsoring Main PLO member', () => {
			const associateRoles = ['associate'];
			const mainPloRoles = ['main_plo'];

			const isMainPlo = (roles: string[]) => roles.includes('main_plo');
			const isAssociate = (roles: string[]) => roles.includes('associate');
			const canCastBallot = (roles: string[], rel?: any) => canVote(roles as any, rel);
			const canCreateBooking = (roles: string[], rel?: any) => canBookCalendar(roles as any, rel);
			const canInviteAssociates = (roles: string[]) => roles.includes('main_plo') || roles.includes('secretary');

			expect(isMainPlo(mainPloRoles)).toBe(true);
			expect(canInviteAssociates(mainPloRoles)).toBe(true);
			expect(canCastBallot(mainPloRoles)).toBe(true);
			expect(canCreateBooking(mainPloRoles)).toBe(true);

			expect(isAssociate(associateRoles)).toBe(true);
			expect(canInviteAssociates(associateRoles)).toBe(false);

			// Family member: view only
			expect(canCastBallot(associateRoles, 'family')).toBe(false);
			expect(canCreateBooking(associateRoles, 'family')).toBe(false);

			// Co-Owner: can create calendar entries, cannot vote
			expect(canCastBallot(associateRoles, 'co_owner')).toBe(false);
			expect(canCreateBooking(associateRoles, 'co_owner')).toBe(true);

			// Authorised Delegate: can vote on behalf of Main PLO, cannot create calendar entries
			expect(canCastBallot(associateRoles, 'delegate')).toBe(true);
			expect(canCreateBooking(associateRoles, 'delegate')).toBe(false);
		});
	});
});
