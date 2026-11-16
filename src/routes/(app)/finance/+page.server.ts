import type { PageServerLoad, Actions } from './$types';
import { error, fail } from '@sveltejs/kit';
import { getDb, schema } from '$lib/server/db';
import { desc, eq } from 'drizzle-orm';
import { canAccessFinance } from '$lib/auth/roles';
import { logAuditEvent } from '$lib/server/audit';
import { ensureDefaultFinancialRecords } from '$lib/server/db/seed';

export const load: PageServerLoad = async ({ locals, platform }) => {
	if (!locals.user || !canAccessFinance(locals.user.roles)) {
		throw error(403, 'Access Denied: Executive or Secretary role required to access financial accounts.');
	}

	if (!platform?.env?.DB) {
		return {
			user: locals.user,
			records: [],
			metrics: {
				totalLiquidityCents: 0,
				operatingBalanceCents: 0,
				capitalFundCents: 0,
				antiPoachingCents: 0,
				bomaCents: 0,
				ytdLeviesCents: 0,
				ytdBomaCents: 0,
				ytdExpensesCents: 0
			}
		};
	}

	const db = getDb(platform.env.DB);

	// Ensure realistic sample financial records if empty
	await ensureDefaultFinancialRecords(platform.env.DB, locals.user.id);

	const records = await db.query.financialRecords.findMany({
		orderBy: (fr, { desc }) => [desc(fr.date), desc(fr.createdAt)],
		with: {
			author: true
		}
	});

	// Compute financial KPIs
	let totalLiquidityCents = 0;
	let operatingBalanceCents = 0;
	let capitalFundCents = 0;
	let antiPoachingCents = 0;
	let bomaCents = 0;
	let ytdLeviesCents = 0;
	let ytdBomaCents = 0;
	let ytdExpensesCents = 0;

	for (const r of records) {
		totalLiquidityCents += r.amountCents;

		if (r.accountName === 'Operating Account') {
			operatingBalanceCents += r.amountCents;
		} else if (r.accountName === 'Reserve Capital Fund') {
			capitalFundCents += r.amountCents;
		} else if (r.accountName === 'Emergency Anti-Poaching Fund') {
			antiPoachingCents += r.amountCents;
		} else if (r.accountName === 'Boma Operations') {
			bomaCents += r.amountCents;
		}

		if (r.transactionType === 'levy_income') {
			ytdLeviesCents += r.amountCents;
		} else if (r.transactionType === 'boma_sales_revenue') {
			ytdBomaCents += r.amountCents;
		} else if (r.amountCents < 0) {
			ytdExpensesCents += Math.abs(r.amountCents);
		}
	}

	return {
		user: locals.user,
		records,
		metrics: {
			totalLiquidityCents,
			operatingBalanceCents,
			capitalFundCents,
			antiPoachingCents,
			bomaCents,
			ytdLeviesCents,
			ytdBomaCents,
			ytdExpensesCents
		}
	};
};

export const actions: Actions = {
	createRecord: async ({ request, locals, platform }) => {
		if (!locals.user || !canAccessFinance(locals.user.roles)) {
			return fail(403, { error: 'Unauthorized: Executive or Secretary role required.' });
		}
		if (!platform?.env?.DB) {
			return fail(500, { error: 'Database service unavailable.' });
		}

		const formData = await request.formData();
		const accountName = (formData.get('accountName') as string)?.trim();
		const transactionType = (formData.get('transactionType') as string)?.trim();
		const direction = (formData.get('direction') as string)?.trim() || 'expense';
		const amountZarRaw = (formData.get('amountZar') as string)?.trim();
		const description = (formData.get('description') as string)?.trim();
		const date = (formData.get('date') as string)?.trim();

		if (!accountName || !transactionType || !amountZarRaw || !description || !date) {
			return fail(400, { error: 'Please provide all mandatory transaction fields.' });
		}

		const parsedAmount = parseFloat(amountZarRaw);
		if (isNaN(parsedAmount) || parsedAmount <= 0) {
			return fail(400, { error: 'Please enter a valid positive numeric amount.' });
		}

		const amountCents = Math.round(parsedAmount * 100) * (direction === 'expense' ? -1 : 1);
		const recordId = crypto.randomUUID();
		const db = getDb(platform.env.DB);

		await db.insert(schema.financialRecords).values({
			id: recordId,
			accountName,
			transactionType,
			amountCents,
			description,
			date,
			createdBy: locals.user.id
		});

		// Immutable audit entry
		await logAuditEvent(platform.env.DB, {
			userId: locals.user.id,
			userEmail: locals.user.email,
			roleAtTime: locals.user.roles.join(','),
			actionType: 'FINANCIAL_RECORD_CREATED',
			recordId,
			recordType: 'financial_records',
			details: {
				accountName,
				transactionType,
				amountCents,
				amountZar: parsedAmount,
				direction,
				description,
				date
			}
		});

		return { success: true };
	},

	deleteRecord: async ({ request, locals, platform }) => {
		if (!locals.user || !canAccessFinance(locals.user.roles)) {
			return fail(403, { error: 'Unauthorized.' });
		}
		if (!platform?.env?.DB) {
			return fail(500, { error: 'Database service unavailable.' });
		}

		const formData = await request.formData();
		const id = (formData.get('id') as string)?.trim();

		if (!id) {
			return fail(400, { error: 'Missing record identifier.' });
		}

		const db = getDb(platform.env.DB);
		const existing = await db.query.financialRecords.findFirst({
			where: eq(schema.financialRecords.id, id)
		});

		if (!existing) {
			return fail(404, { error: 'Financial record not found.' });
		}

		await db.delete(schema.financialRecords).where(eq(schema.financialRecords.id, id));

		await logAuditEvent(platform.env.DB, {
			userId: locals.user.id,
			userEmail: locals.user.email,
			roleAtTime: locals.user.roles.join(','),
			actionType: 'FINANCIAL_RECORD_DELETED',
			recordId: id,
			recordType: 'financial_records',
			details: {
				deletedRecord: existing
			}
		});

		return { success: true };
	}
};
