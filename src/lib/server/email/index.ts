export interface InviteEmailPayload {
	toEmail: string;
	inviteeName?: string | null;
	sponsorName: string;
	sponsorEmail?: string;
	portionName?: string | null;
	relationship?: string;
	inviteUrl: string;
}

export function escapeHtml(str: string): string {
	return str
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#039;');
}

export function generateInviteEmailHtml(payload: InviteEmailPayload): string {
	const safeRecipient = escapeHtml(payload.inviteeName?.trim() || payload.toEmail.split('@')[0]);
	const safeSponsor = escapeHtml(payload.sponsorName);
	const safePortion = payload.portionName ? escapeHtml(payload.portionName) : null;
	const relationshipLabel =
		payload.relationship === 'co_owner'
			? 'Co-Owner'
			: payload.relationship === 'delegate'
				? 'Authorised Delegate'
				: 'Family Member';
	const safeRelationship = escapeHtml(relationshipLabel);
	const safeUrl = escapeHtml(payload.inviteUrl);

	let roleFeaturesHtml = '';
	if (payload.relationship === 'co_owner') {
		roleFeaturesHtml = `
        <li><strong>Reserve Calendar Bookings:</strong> Authorized to create, schedule, and manage excursion dates for your land portion.</li>
        <li><strong>Wildlife &amp; Ecological Census:</strong> Review historical census records and game count tallies.</li>
        <li><strong>Document Repository:</strong> Read reserve constitutions, resolutions, and operational updates.</li>
        <li><strong>Governance Motions:</strong> View active polls and motions (voting reserved for primary landowner or delegate).</li>`;
	} else if (payload.relationship === 'delegate') {
		roleFeaturesHtml = `
        <li><strong>Governance Proxy Voting:</strong> Cast official ballots on open resolutions and motions on behalf of ${safeSponsor}.</li>
        <li><strong>Shared Reserve Calendar:</strong> View scheduled member excursions, ecological maintenance, and game counts (view-only).</li>
        <li><strong>Wildlife &amp; Ecological Census:</strong> Review historical census records and game count tallies.</li>
        <li><strong>Document Repository:</strong> Read reserve constitutions, resolutions, and operational updates.</li>`;
	} else {
		roleFeaturesHtml = `
        <li><strong>Shared Reserve Calendar:</strong> View scheduled member excursions, ecological maintenance, and game counts (view-only).</li>
        <li><strong>Wildlife &amp; Ecological Census:</strong> Review historical census records and game count tallies.</li>
        <li><strong>Document Repository:</strong> Read reserve constitutions, resolutions, and operational updates.</li>
        <li><strong>Governance Ballots:</strong> View active polls and motions submitted to the reserve owners.</li>`;
	}

	return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invitation to Join ACNRPLO Reserve Profile</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #f5f4ef;
      margin: 0;
      padding: 32px 16px;
      color: #292524;
    }
    .wrapper {
      max-width: 580px;
      margin: 0 auto;
      background: #ffffff;
      border-radius: 16px;
      border: 1px solid #e7e5e4;
      overflow: hidden;
      box-shadow: 0 4px 16px rgba(0,0,0,0.06);
    }
    .header {
      background: linear-gradient(135deg, #1b382b 0%, #2e4a3d 100%);
      padding: 32px 28px;
      color: #ffffff;
      text-align: left;
    }
    .badge {
      display: inline-block;
      background: rgba(255, 255, 255, 0.15);
      border: 1px solid rgba(255, 255, 255, 0.25);
      color: #fef08a;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      padding: 4px 10px;
      border-radius: 6px;
      margin-bottom: 12px;
    }
    .header h1 {
      margin: 0;
      font-size: 22px;
      font-weight: 800;
      letter-spacing: -0.5px;
      color: #ffffff;
    }
    .header p {
      margin: 8px 0 0 0;
      color: #d6d3d1;
      font-size: 13px;
    }
    .content {
      padding: 32px 28px;
    }
    .greeting {
      font-size: 16px;
      font-weight: 700;
      color: #1c1917;
      margin-bottom: 16px;
    }
    .intro {
      font-size: 14px;
      line-height: 1.6;
      color: #44403c;
      margin-bottom: 24px;
    }
    .detail-card {
      background-color: #fafaf9;
      border: 1px solid #e7e5e4;
      border-radius: 12px;
      padding: 18px 20px;
      margin-bottom: 24px;
    }
    .detail-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 6px 0;
      border-bottom: 1px solid #f0eee9;
      font-size: 13px;
    }
    .detail-row:last-child {
      border-bottom: none;
      padding-bottom: 0;
    }
    .detail-row:first-child {
      padding-top: 0;
    }
    .label {
      color: #78716c;
      font-weight: 600;
    }
    .value {
      color: #1c1917;
      font-weight: 700;
    }
    .features-list {
      margin: 20px 0;
      padding-left: 20px;
      font-size: 13px;
      line-height: 1.7;
      color: #57534e;
    }
    .btn-container {
      text-align: center;
      margin: 32px 0 24px 0;
    }
    .btn {
      display: inline-block;
      background-color: #1b382b;
      color: #ffffff !important;
      text-decoration: none;
      font-weight: 700;
      font-size: 15px;
      padding: 14px 28px;
      border-radius: 12px;
      box-shadow: 0 4px 12px rgba(27, 56, 43, 0.25);
    }
    .fallback-url {
      font-size: 11px;
      color: #78716c;
      word-break: break-all;
      line-height: 1.5;
      background-color: #fafaf9;
      padding: 12px;
      border-radius: 8px;
      border: 1px dashed #d6d3d1;
      margin-top: 16px;
    }
    .footer {
      background-color: #f5f4ef;
      border-top: 1px solid #e7e5e4;
      padding: 20px 28px;
      font-size: 12px;
      color: #78716c;
      line-height: 1.5;
    }
    .footer p {
      margin: 4px 0;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <div class="badge">ACNRPLO Reserve Portal</div>
      <h1>Member Profile Invitation</h1>
      <p>Atherstone Collaborative Nature Reserve — Private Land Owners</p>
    </div>
    <div class="content">
      <div class="greeting">Hello ${safeRecipient},</div>
      <p class="intro">
        <strong>${safeSponsor}</strong> has invited you to join their cadastral profile on the official Atherstone Collaborative Nature Reserve Private Land Owners (ACNRPLO) portal.
      </p>

      <div class="detail-card">
        <table width="100%" cellspacing="0" cellpadding="0" style="font-size: 13px;">
          <tr>
            <td style="color: #78716c; padding: 6px 0; font-weight: 600;">Sponsoring Member:</td>
            <td style="color: #1c1917; padding: 6px 0; font-weight: 700; text-align: right;">${safeSponsor}</td>
          </tr>
          ${safePortion ? `<tr>
            <td style="color: #78716c; padding: 6px 0; font-weight: 600;">Cadastral Land Portion:</td>
            <td style="color: #1c1917; padding: 6px 0; font-weight: 700; text-align: right;">${safePortion}</td>
          </tr>` : ''}
          <tr>
            <td style="color: #78716c; padding: 6px 0; font-weight: 600;">Assigned Role:</td>
            <td style="color: #15803d; padding: 6px 0; font-weight: 700; text-align: right;">Associate Member (${safeRelationship})</td>
          </tr>
        </table>
      </div>

      <p style="font-size: 13px; color: #44403c; margin-bottom: 8px;">
        As an Associate Member (${safeRelationship}), your profile includes:
      </p>
      <ul class="features-list">
        ${roleFeaturesHtml}
      </ul>

      <p style="font-size: 13px; color: #44403c; margin-top: 16px;">
        To activate your account, please click the button below to choose and set your secure password:
      </p>

      <div class="btn-container">
        <a href="${safeUrl}" class="btn">Set Password &amp; Join Profile</a>
      </div>

      <div class="fallback-url">
        If the button does not work, copy and paste this link into your browser:<br>
        <a href="${safeUrl}" style="color: #1b382b;">${safeUrl}</a>
      </div>

      <p style="font-size: 11px; color: #a8a29e; margin-top: 20px;">
        ⚠️ This invitation link is secure and valid for <strong>7 days</strong>. If you did not expect this invitation, you can safely disregard this email.
      </p>
    </div>
    <div class="footer">
      <p><strong>Atherstone Collaborative Nature Reserve (ACNRPLO)</strong></p>
      <p>Delivered via Cloudflare Email Service from <strong>dialogdev.net</strong>.</p>
    </div>
  </div>
</body>
</html>`;
}

export function generateInviteEmailText(payload: InviteEmailPayload): string {
	const recipient = payload.inviteeName?.trim() || payload.toEmail.split('@')[0];
	const portion = payload.portionName ? ` (${payload.portionName})` : '';
	const relationshipLabel =
		payload.relationship === 'co_owner'
			? 'Co-Owner (Can Add Calendar Entries)'
			: payload.relationship === 'delegate'
				? 'Authorised Delegate (Can Vote on Behalf of Main PLO)'
				: 'Family Member (View Only)';

	let roleFeaturesText = '';
	if (payload.relationship === 'co_owner') {
		roleFeaturesText = `• Reserve Calendar Excursion Bookings & Scheduling
• Wildlife Census Records & Historical Counts
• Constitutional Governance Records & Document Vault
• Active Polls & Motion Tracking (View Only)`;
	} else if (payload.relationship === 'delegate') {
		roleFeaturesText = `• Governance Proxy Voting on Behalf of ${payload.sponsorName}
• Shared Reserve Calendar & Planned Excursions (View Only)
• Wildlife Census Records & Historical Counts
• Constitutional Governance Records & Document Vault`;
	} else {
		roleFeaturesText = `• Shared Reserve Calendar & Planned Excursions (View Only)
• Wildlife Census Records & Historical Counts
• Constitutional Governance Records & Document Vault
• Active Polls & Motion Tracking (View Only)`;
	}

	return `=================================================================
ACNRPLO RESERVE PORTAL - MEMBER PROFILE INVITATION
=================================================================

Hello ${recipient},

${payload.sponsorName}${portion} has invited you to join their cadastral profile on the Atherstone Collaborative Nature Reserve Private Land Owners (ACNRPLO) portal.

INVITATION DETAILS:
-------------------
• Sponsoring Member: ${payload.sponsorName}
${payload.portionName ? `• Cadastral Portion:  ${payload.portionName}\n` : ''}• Role:              Associate Member (${relationshipLabel})
• Status:            Pending Password Setup

YOUR ACCESS PRIVILEGES:
-----------------------
${roleFeaturesText}

ACTIVATE YOUR ACCOUNT:
----------------------
To set your password and complete registration, click the link below:

${payload.inviteUrl}

(This invitation link is valid for 7 days.)

If you were not expecting this invitation, you may safely ignore this email.

=================================================================
Delivered via Cloudflare Email Service from dialogdev.net
Atherstone Collaborative Nature Reserve — Private Land Owners
https://acnrploapp.stefanvandyk3.workers.dev
=================================================================`;
}

export async function sendInviteEmail(
	platform: App.Platform | undefined,
	payload: InviteEmailPayload
): Promise<{ success: boolean; simulated?: boolean; messageId?: string; error?: string }> {
	const fromDomain = 'dialogdev.net';
	const fromEmail = platform?.env?.SENDER_EMAIL || `invitations@${fromDomain}`;
	const subject = `Invitation to join ACNRPLO Reserve Profile from ${payload.sponsorName}`;
	const html = generateInviteEmailHtml(payload);
	const text = generateInviteEmailText(payload);

	const emailBinding = platform?.env?.EMAIL || platform?.env?.SEND_EMAIL;

	if (emailBinding && typeof emailBinding.send === 'function') {
		try {
			const res = await emailBinding.send({
				to: payload.toEmail,
				from: {
					email: fromEmail,
					name: 'ACNRPLO Reserve'
				},
				replyTo: payload.sponsorEmail
					? {
							email: payload.sponsorEmail,
							name: payload.sponsorName
					  }
					: undefined,
				subject,
				text,
				html
			});

			console.log(`[Cloudflare Email Service] Dispatched invite email to ${payload.toEmail} from ${fromEmail}`);
			return {
				success: true,
				messageId: (res as any)?.messageId || 'sent'
			};
		} catch (err: unknown) {
			const errorMsg = err instanceof Error ? err.message : String(err);
			console.error('[Cloudflare Email Service] Failed to send email via binding:', errorMsg);

			// Fallback retry with string from address in case binding requires simple string format
			try {
				const retryRes = await emailBinding.send({
					to: payload.toEmail,
					from: fromEmail,
					subject,
					text,
					html
				});
				return {
					success: true,
					messageId: (retryRes as any)?.messageId || 'sent'
				};
			} catch (retryErr: unknown) {
				const retryMsg = retryErr instanceof Error ? retryErr.message : String(retryErr);
				console.error('[Cloudflare Email Service] Retry with string from failed:', retryMsg);
				return {
					success: false,
					error: retryMsg
				};
			}
		}
	}

	// Simulation for local dev / vitest environments
	console.log(`[Cloudflare Email Service SIMULATION]`);
	console.log(`  To: ${payload.toEmail}`);
	console.log(`  From: ${fromEmail}`);
	console.log(`  Subject: ${subject}`);
	console.log(`  Invite Link: ${payload.inviteUrl}`);

	return {
		success: true,
		simulated: true,
		messageId: `simulated-${Date.now()}`
	};
}
