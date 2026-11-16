import { fail, error } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { getDb, schema } from '$lib/server/db';
import { desc } from 'drizzle-orm';
import { logAuditEvent } from '$lib/server/audit';
import { hasAnyRole } from '$lib/auth/roles';

export const load: PageServerLoad = async ({ locals, platform }) => {
	if (!locals.user || !hasAnyRole(locals.user.roles, ['secretary', 'executive'])) {
		throw error(403, 'Access Denied: The Secretary or Executive role is required to view Executive Finance.');
	}

	if (!platform?.env?.DB) {
		return {
			user: locals.user,
			records: [],
			balances: {
				totalLiquidityCents: 0,
				operatingBalanceCents: 0,
				capitalFundCents: 0,
				apuFundCents: 0,
				bomaFundCents: 0
			}
		};
	}

	const db = getDb(platform.env.DB);

	const records = await db.query.financialRecords.findMany({
		orderBy: (fr, { desc }) => [desc(fr.date), desc(fr.createdAt)],
		with: { author: true }
	});

	let totalLiquidityCents = 0;
	let operatingBalanceCents = 0;
	let capitalFundCents = 0;
	let apuFundCents = 0;
	let bomaFundCents = 0;

	for (const r of records) {
		totalLiquidityCents += r.amountCents;
		if (r.accountName === 'Operating Account') operatingBalanceCents += r.amountCents;
		if (r.accountName === 'Reserve Capital Fund') capitalFundCents += r.amountCents;
		if (r.accountName === 'Emergency Anti-Poaching Fund') apuFundCents += r.amountCents;
		if (r.accountName === 'Boma Operations') bomaFundCents += r.amountCents;
	}

	return {
		user: locals.user,
		records,
		balances: {
			totalLiquidityCents,
			operatingBalanceCents,
			capitalFundCents,
			apuFundCents,
			bomaFundCents
		}
	};
};

export const actions: Actions = {
	createFinancialRecord: async ({ request, locals, platform }) => {
		if (!locals.user || !hasAnyRole(locals.user.roles, ['secretary', 'executive'])) {
			return fail(403, { error: 'Unauthorized: Secretary role required to commit financial records.' });
		}
		if (!platform?.env?.DB) return fail(500, { error: 'Database unavailable' });

		const formData = await request.formData();
		const accountName = formData.get('accountName')?.toString().trim();
		const direction = formData.get('direction')?.toString();
		const transactionType = formData.get('transactionType')?.toString().trim();
		const amountZar = parseFloat(formData.get('amountZar')?.toString() || '0');
		const date = formData.get('date')?.toString() || new Date().toISOString().split('T')[0];
		const description = formData.get('description')?.toString().trim();

		if (!accountName || !transactionType || !description || amountZar <= 0) {
			return fail(400, { error: 'All fields and positive amount are required.' });
		}

		const absCents = Math.round(amountZar * 100);
		const amountCents = direction === 'expense' ? -absCents : absCents;
		const id = crypto.randomUUID();
		const db = getDb(platform.env.DB);

		await db.insert(schema.financialRecords).values({
			id,
			accountName,
			transactionType,
			amountCents,
			description,
			date,
			createdBy: locals.user.id
		});

		await logAuditEvent(platform.env.DB, {
			userId: locals.user.id,
			userEmail: locals.user.email,
			roleAtTime: 'secretary',
			actionType: 'FINANCIAL_RECORD_COMMITTED',
			recordId: id,
			recordType: 'financial_record',
			details: { accountName, transactionType, amountCents, date, description }
		});

		return { success: true };
	}
};
