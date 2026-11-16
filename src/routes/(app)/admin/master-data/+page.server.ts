import { fail, error } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { getDb, schema } from '$lib/server/db';
import { eq, asc, desc, and } from 'drizzle-orm';
import { logAuditEvent } from '$lib/server/audit';
import { hasAnyRole } from '$lib/auth/roles';
import { ensureMasterData } from '$lib/server/db/seed';

export const load: PageServerLoad = async ({ locals, platform }) => {
	if (!locals.user || !hasAnyRole(locals.user.roles, ['secretary'])) {
		throw error(403, 'Access Denied: The Secretary role is strictly required to manage Master Data Registers.');
	}

	if (!platform?.env?.DB) {
		return {
			user: locals.user,
			masterSpecies: [],
			masterVisitCategories: [],
			landPortions: [],
			quotas: [],
			users: [],
			stats: {
				speciesCount: 0,
				activeSpeciesCount: 0,
				categoriesCount: 0,
				portionsCount: 0,
				totalHectares: 0,
				totalBps: 0,
				quotasCount: 0
			}
		};
	}

	const db = getDb(platform.env.DB);
	await ensureMasterData(platform.env.DB);

	// 1. Wildlife Species Register
	const masterSpecies = await db.query.masterSpecies.findMany({
		orderBy: (ms, { asc }) => [asc(ms.name)]
	});

	// 2. Visit Categories & Calendar Legend Master
	const masterVisitCategories = await db.query.masterVisitCategories.findMany({
		orderBy: (mc, { asc }) => [asc(mc.key)]
	});

	// 3. Cadastral Land Portions Master
	const landPortions = await db.query.landPortions.findMany({
		with: { owner: true }
	});

	// 4. Annual Quota Baselines with Allocations
	const quotasList = await db.query.quotas.findMany({
		orderBy: (q, { desc, asc }) => [desc(q.year), asc(q.category), asc(q.subcategory), asc(q.species)],
		with: {
			allocations: {
				with: { user: true }
			}
		}
	});

	// 5. Landowners (for assignment references)
	const rawUsers = await db.query.user.findMany({
		orderBy: (u, { asc }) => [asc(u.name)]
	});

	const ploLandowners = rawUsers
		.filter((u) => u.status === 'active')
		.map((u) => {
			const uPortions = landPortions.filter((p) => p.userId === u.id && p.status === 'active');
			const uBps = uPortions.reduce((sum, p) => sum + (p.ownershipBps || 0), 0);
			return {
				id: u.id,
				name: u.name,
				email: u.email,
				portions: uPortions.map((p) => p.portionName),
				ownershipBps: uBps,
				ownershipPercentage: (uBps / 10000) * 100
			};
		})
		.filter((u) => u.ownershipBps > 0 || u.portions.length > 0);

	const totalHectares = landPortions
		.filter((p) => p.status === 'active')
		.reduce((sum, p) => sum + (p.hectares || 0), 0);

	const totalBps = landPortions
		.filter((p) => p.status === 'active')
		.reduce((sum, p) => sum + (p.ownershipBps || 0), 0);

	return {
		user: locals.user,
		masterSpecies,
		masterVisitCategories,
		landPortions,
		quotas: quotasList,
		users: rawUsers,
		ploLandowners,
		stats: {
			speciesCount: masterSpecies.length,
			activeSpeciesCount: masterSpecies.filter((s) => s.isActive === 1).length,
			categoriesCount: masterVisitCategories.length,
			portionsCount: landPortions.length,
			totalHectares,
			totalBps,
			quotasCount: quotasList.length
		}
	};
};

export const actions: Actions = {
	// =========================================================================
	// 1. SPECIES REGISTER ACTIONS
	// =========================================================================
	createSpecies: async ({ request, locals, platform }) => {
		if (!locals.user || !hasAnyRole(locals.user.roles, ['secretary'])) {
			return fail(403, { error: 'Unauthorized.' });
		}
		if (!platform?.env?.DB) return fail(500, { error: 'Database unavailable' });

		const formData = await request.formData();
		const name = formData.get('name')?.toString().trim();
		const category = (formData.get('category')?.toString().trim() || 'plains_game') as
			| 'plains_game'
			| 'dangerous_game'
			| 'carnivore'
			| 'other';
		const defaultPriceZar = parseFloat(formData.get('defaultPriceZar')?.toString() || '0');

		if (!name) return fail(400, { error: 'Species name is required.' });

		const defaultPriceCents = Math.round(Math.max(0, defaultPriceZar) * 100);
		const id = crypto.randomUUID();
		const db = getDb(platform.env.DB);

		const existing = await db.query.masterSpecies.findFirst({
			where: eq(schema.masterSpecies.name, name)
		});
		if (existing) {
			return fail(400, { error: `Species '${name}' already exists in the master register.` });
		}

		await db.insert(schema.masterSpecies).values({
			id,
			name,
			category,
			defaultPriceCents,
			isActive: 1
		});

		await logAuditEvent(platform.env.DB, {
			userId: locals.user.id,
			userEmail: locals.user.email,
			roleAtTime: 'secretary',
			actionType: 'MASTER_SPECIES_CREATED',
			recordId: id,
			recordType: 'master_species',
			details: { name, category, defaultPriceCents }
		});

		return { success: true };
	},

	updateSpecies: async ({ request, locals, platform }) => {
		if (!locals.user || !hasAnyRole(locals.user.roles, ['secretary'])) {
			return fail(403, { error: 'Unauthorized.' });
		}
		if (!platform?.env?.DB) return fail(500, { error: 'Database unavailable' });

		const formData = await request.formData();
		const id = formData.get('id')?.toString();
		const name = formData.get('name')?.toString().trim();
		const category = (formData.get('category')?.toString().trim() || 'plains_game') as
			| 'plains_game'
			| 'dangerous_game'
			| 'carnivore'
			| 'other';
		const defaultPriceZar = parseFloat(formData.get('defaultPriceZar')?.toString() || '0');

		if (!id || !name) return fail(400, { error: 'Species ID and name are required.' });

		const defaultPriceCents = Math.round(Math.max(0, defaultPriceZar) * 100);
		const db = getDb(platform.env.DB);

		await db
			.update(schema.masterSpecies)
			.set({
				name,
				category,
				defaultPriceCents
			})
			.where(eq(schema.masterSpecies.id, id));

		await logAuditEvent(platform.env.DB, {
			userId: locals.user.id,
			userEmail: locals.user.email,
			roleAtTime: 'secretary',
			actionType: 'MASTER_SPECIES_UPDATED',
			recordId: id,
			recordType: 'master_species',
			details: { name, category, defaultPriceCents }
		});

		return { success: true };
	},

	toggleSpeciesStatus: async ({ request, locals, platform }) => {
		if (!locals.user || !hasAnyRole(locals.user.roles, ['secretary'])) {
			return fail(403, { error: 'Unauthorized.' });
		}
		if (!platform?.env?.DB) return fail(500, { error: 'Database unavailable' });

		const formData = await request.formData();
		const id = formData.get('id')?.toString();
		if (!id) return fail(400, { error: 'Missing species ID' });

		const db = getDb(platform.env.DB);
		const existing = await db.query.masterSpecies.findFirst({
			where: eq(schema.masterSpecies.id, id)
		});
		if (!existing) return fail(404, { error: 'Species not found' });

		const nextActive = existing.isActive === 1 ? 0 : 1;
		await db
			.update(schema.masterSpecies)
			.set({ isActive: nextActive })
			.where(eq(schema.masterSpecies.id, id));

		await logAuditEvent(platform.env.DB, {
			userId: locals.user.id,
			userEmail: locals.user.email,
			roleAtTime: 'secretary',
			actionType: 'MASTER_SPECIES_STATUS_TOGGLED',
			recordId: id,
			recordType: 'master_species',
			details: { species: existing.name, isActive: nextActive }
		});

		return { success: true };
	},

	// =========================================================================
	// 2. VISIT CATEGORIES & LEGEND ACTIONS
	// =========================================================================
	createVisitCategory: async ({ request, locals, platform }) => {
		if (!locals.user || !hasAnyRole(locals.user.roles, ['secretary'])) {
			return fail(403, { error: 'Unauthorized.' });
		}
		if (!platform?.env?.DB) return fail(500, { error: 'Database unavailable' });

		const formData = await request.formData();
		const rawKey = formData.get('key')?.toString().trim().toLowerCase().replace(/\s+/g, '_');
		const label = formData.get('label')?.toString().trim();
		const icon = formData.get('icon')?.toString().trim() || 'Compass';
		const colorHex = formData.get('colorHex')?.toString().trim() || '#10b981';
		const description = formData.get('description')?.toString().trim() || '';

		if (!rawKey || !label) return fail(400, { error: 'Category key and label are required.' });

		const id = crypto.randomUUID();
		const db = getDb(platform.env.DB);

		const existing = await db.query.masterVisitCategories.findFirst({
			where: eq(schema.masterVisitCategories.key, rawKey)
		});
		if (existing) {
			return fail(400, { error: `Category with key '${rawKey}' already exists.` });
		}

		await db.insert(schema.masterVisitCategories).values({
			id,
			key: rawKey,
			label,
			icon,
			colorHex,
			badgeClass: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border border-purple-300/60 dark:border-purple-700/60',
			description,
			isActive: 1
		});

		await logAuditEvent(platform.env.DB, {
			userId: locals.user.id,
			userEmail: locals.user.email,
			roleAtTime: 'secretary',
			actionType: 'VISIT_CATEGORY_CREATED',
			recordId: id,
			recordType: 'master_visit_categories',
			details: { key: rawKey, label, icon, colorHex, description }
		});

		return { success: true };
	},

	updateVisitCategory: async ({ request, locals, platform }) => {
		if (!locals.user || !hasAnyRole(locals.user.roles, ['secretary'])) {
			return fail(403, { error: 'Unauthorized.' });
		}
		if (!platform?.env?.DB) return fail(500, { error: 'Database unavailable' });

		const formData = await request.formData();
		const id = formData.get('id')?.toString();
		const label = formData.get('label')?.toString().trim();
		const icon = formData.get('icon')?.toString().trim() || 'Compass';
		const colorHex = formData.get('colorHex')?.toString().trim();
		const description = formData.get('description')?.toString().trim();

		if (!id || !label || !colorHex) {
			return fail(400, { error: 'Category ID, label, and color are required.' });
		}

		const db = getDb(platform.env.DB);
		await db
			.update(schema.masterVisitCategories)
			.set({
				label,
				icon,
				colorHex,
				description: description || ''
			})
			.where(eq(schema.masterVisitCategories.id, id));

		await logAuditEvent(platform.env.DB, {
			userId: locals.user.id,
			userEmail: locals.user.email,
			roleAtTime: 'secretary',
			actionType: 'VISIT_CATEGORY_UPDATED',
			recordId: id,
			recordType: 'master_visit_categories',
			details: { label, icon, colorHex, description }
		});

		return { success: true };
	},

	deleteVisitCategory: async ({ request, locals, platform }) => {
		if (!locals.user || !hasAnyRole(locals.user.roles, ['secretary'])) {
			return fail(403, { error: 'Unauthorized: Secretary role required.' });
		}
		if (!platform?.env?.DB) return fail(500, { error: 'Database unavailable' });

		const formData = await request.formData();
		const id = formData.get('id')?.toString();
		if (!id) return fail(400, { error: 'Category ID is required.' });

		const db = getDb(platform.env.DB);
		const existing = await db.query.masterVisitCategories.findFirst({
			where: eq(schema.masterVisitCategories.id, id)
		});
		if (!existing) return fail(404, { error: 'Visit category not found.' });

		await db.delete(schema.masterVisitCategories).where(eq(schema.masterVisitCategories.id, id));

		await logAuditEvent(platform.env.DB, {
			userId: locals.user.id,
			userEmail: locals.user.email,
			roleAtTime: 'secretary',
			actionType: 'VISIT_CATEGORY_DELETED',
			recordId: id,
			recordType: 'master_visit_categories',
			details: { key: existing.key, label: existing.label }
		});

		return { success: true, message: `Visit category "${existing.label}" removed from master register.` };
	},

	// =========================================================================
	// 3. CADASTRAL PORTION ACTIONS
	// =========================================================================
	createPortion: async ({ request, locals, platform }) => {
		if (!locals.user || !hasAnyRole(locals.user.roles, ['secretary'])) {
			return fail(403, { error: 'Unauthorized.' });
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

	// =========================================================================
	// 4. QUOTA BASELINE & PLO ALLOCATION ACTIONS
	// =========================================================================
	createQuota: async ({ request, locals, platform }) => {
		if (!locals.user || !hasAnyRole(locals.user.roles, ['secretary'])) {
			return fail(403, { error: 'Unauthorized.' });
		}
		if (!platform?.env?.DB) return fail(500, { error: 'Database unavailable' });

		const formData = await request.formData();
		const year = parseInt(formData.get('year')?.toString() || new Date().getFullYear().toString(), 10);
		const category = formData.get('category')?.toString().trim().toLowerCase() === 'ledet' ? 'ledet' : 'plo';
		const subcategory = formData.get('subcategory')?.toString().trim().toLowerCase() === 'selling' ? 'selling' : 'hunting';
		const species = formData.get('species')?.toString().trim();
		const totalAllocation = parseInt(formData.get('totalAllocation')?.toString() || '0', 10);
		const unitPriceZar = parseFloat(formData.get('unitPriceZar')?.toString() || '0');
		const notes = formData.get('notes')?.toString().trim() || null;

		if (!species) return fail(400, { error: 'Wildlife species is required' });
		if (isNaN(totalAllocation) || totalAllocation < 0) {
			return fail(400, { error: 'Total allocation must be a positive number' });
		}

		const db = getDb(platform.env.DB);
		const id = crypto.randomUUID();
		const unitPriceCents = Math.round(Math.max(0, unitPriceZar) * 100);

		await db.insert(schema.quotas).values({
			id,
			category,
			subcategory,
			species,
			totalAllocation,
			unitPriceCents,
			year,
			notes
		});

		await logAuditEvent(platform.env.DB, {
			userId: locals.user.id,
			userEmail: locals.user.email,
			roleAtTime: 'secretary',
			actionType: 'QUOTA_CREATED',
			recordId: id,
			recordType: 'quotas',
			details: { year, category, subcategory, species, totalAllocation, unitPriceCents }
		});

		return { success: true };
	},

	updateQuota: async ({ request, locals, platform }) => {
		if (!locals.user || !hasAnyRole(locals.user.roles, ['secretary'])) {
			return fail(403, { error: 'Unauthorized.' });
		}
		if (!platform?.env?.DB) return fail(500, { error: 'Database unavailable' });

		const formData = await request.formData();
		const id = formData.get('id')?.toString();
		if (!id) return fail(400, { error: 'Missing quota ID' });

		const year = parseInt(formData.get('year')?.toString() || new Date().getFullYear().toString(), 10);
		const category = formData.get('category')?.toString().trim().toLowerCase() === 'ledet' ? 'ledet' : 'plo';
		const subcategory = formData.get('subcategory')?.toString().trim().toLowerCase() === 'selling' ? 'selling' : 'hunting';
		const species = formData.get('species')?.toString().trim();
		const totalAllocation = parseInt(formData.get('totalAllocation')?.toString() || '0', 10);
		const unitPriceZar = parseFloat(formData.get('unitPriceZar')?.toString() || '0');
		const notes = formData.get('notes')?.toString().trim() || null;

		if (!species) return fail(400, { error: 'Wildlife species is required' });
		if (isNaN(totalAllocation) || totalAllocation < 0) {
			return fail(400, { error: 'Total allocation must be a positive number' });
		}

		const db = getDb(platform.env.DB);
		const unitPriceCents = Math.round(Math.max(0, unitPriceZar) * 100);

		await db
			.update(schema.quotas)
			.set({
				category,
				subcategory,
				species,
				totalAllocation,
				unitPriceCents,
				year,
				notes
			})
			.where(eq(schema.quotas.id, id));

		await logAuditEvent(platform.env.DB, {
			userId: locals.user.id,
			userEmail: locals.user.email,
			roleAtTime: 'secretary',
			actionType: 'QUOTA_UPDATED',
			recordId: id,
			recordType: 'quotas',
			details: { id, year, category, subcategory, species, totalAllocation, unitPriceCents }
		});

		return { success: true };
	},

	deleteQuota: async ({ request, locals, platform }) => {
		if (!locals.user || !hasAnyRole(locals.user.roles, ['secretary'])) {
			return fail(403, { error: 'Unauthorized.' });
		}
		if (!platform?.env?.DB) return fail(500, { error: 'Database unavailable' });

		const formData = await request.formData();
		const id = formData.get('id')?.toString();
		if (!id) return fail(400, { error: 'Missing quota ID' });

		const db = getDb(platform.env.DB);
		await db.delete(schema.quotas).where(eq(schema.quotas.id, id));

		await logAuditEvent(platform.env.DB, {
			userId: locals.user.id,
			userEmail: locals.user.email,
			roleAtTime: 'secretary',
			actionType: 'QUOTA_DELETED',
			recordId: id,
			recordType: 'quotas',
			details: { id }
		});

		return { success: true };
	},

	saveQuotaAllocations: async ({ request, locals, platform }) => {
		if (!locals.user || !hasAnyRole(locals.user.roles, ['secretary'])) {
			return fail(403, { error: 'Unauthorized.' });
		}
		if (!platform?.env?.DB) return fail(500, { error: 'Database unavailable' });

		const formData = await request.formData();
		const quotaId = formData.get('quotaId')?.toString();
		if (!quotaId) return fail(400, { error: 'Missing quota ID' });

		const db = getDb(platform.env.DB);
		const quota = await db.query.quotas.findFirst({
			where: eq(schema.quotas.id, quotaId)
		});
		if (!quota) return fail(404, { error: 'Quota record not found' });

		const userAllocations: { userId: string; headCount: number }[] = [];
		for (const [key, val] of formData.entries()) {
			if (key.startsWith('allocation_')) {
				const userId = key.replace('allocation_', '');
				const headCount = parseInt(val.toString() || '0', 10);
				if (!isNaN(headCount) && headCount >= 0) {
					userAllocations.push({ userId, headCount });
				}
			}
		}

		for (const item of userAllocations) {
			const existing = await db.query.quotaAllocations.findFirst({
				where: and(
					eq(schema.quotaAllocations.quotaId, quotaId),
					eq(schema.quotaAllocations.userId, item.userId)
				)
			});

			if (existing) {
				await db
					.update(schema.quotaAllocations)
					.set({ allocatedHead: item.headCount })
					.where(eq(schema.quotaAllocations.id, existing.id));
			} else if (item.headCount > 0) {
				await db.insert(schema.quotaAllocations).values({
					id: crypto.randomUUID(),
					quotaId,
					userId: item.userId,
					allocatedHead: item.headCount,
					huntedHead: 0,
					openToBuyHead: 0
				});
			}
		}

		await logAuditEvent(platform.env.DB, {
			userId: locals.user.id,
			userEmail: locals.user.email,
			roleAtTime: 'secretary',
			actionType: 'QUOTA_ALLOCATIONS_UPDATED',
			recordId: quotaId,
			recordType: 'quotas',
			details: {
				quotaId,
				species: quota.species,
				year: quota.year,
				category: quota.category,
				allocations: userAllocations
			}
		});

		return { success: true };
	},

	updateQuotaTariff: async ({ request, locals, platform }) => {
		if (!locals.user || !hasAnyRole(locals.user.roles, ['secretary'])) {
			return fail(403, { error: 'Unauthorized.' });
		}
		if (!platform?.env?.DB) return fail(500, { error: 'Database unavailable' });

		const formData = await request.formData();
		const id = formData.get('id')?.toString();
		const unitPriceZar = parseFloat(formData.get('unitPriceZar')?.toString() || '0');
		const totalAllocation = parseInt(formData.get('totalAllocation')?.toString() || '0', 10);

		if (!id) return fail(400, { error: 'Missing quota ID' });

		const unitPriceCents = Math.round(Math.max(0, unitPriceZar) * 100);
		const db = getDb(platform.env.DB);

		await db
			.update(schema.quotas)
			.set({
				unitPriceCents,
				totalAllocation: Math.max(0, totalAllocation)
			})
			.where(eq(schema.quotas.id, id));

		await logAuditEvent(platform.env.DB, {
			userId: locals.user.id,
			userEmail: locals.user.email,
			roleAtTime: 'secretary',
			actionType: 'QUOTA_TARIFF_UPDATED',
			recordId: id,
			recordType: 'quotas',
			details: { unitPriceCents, totalAllocation }
		});

		return { success: true };
	}
};
