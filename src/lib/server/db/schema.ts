import { relations, sql } from 'drizzle-orm';
import { sqliteTable, text, integer, real, index, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { user } from './auth.schema';

export * from './auth.schema';

// ==========================================
// 1. LAND PORTIONS & OWNERSHIP
// ==========================================
export const landPortions = sqliteTable(
	'land_portions',
	{
		id: text('id').primaryKey(),
		userId: text('user_id').references(() => user.id, { onDelete: 'set null' }),
		portionName: text('portion_name').notNull(), // e.g. "Portion 3 (Kruispad)"
		hectares: real('hectares').notNull().default(0),
		ownershipBps: integer('ownership_bps').notNull().default(0), // Basis points: 100.00% = 10,000 bps
		voteAllocationBps: integer('vote_allocation_bps').notNull().default(0), // Basis points
		status: text('status').notNull().default('active'), // 'active' | 'inactive'
		notes: text('notes'),
		createdAt: integer('created_at', { mode: 'timestamp_ms' })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull(),
		updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.$onUpdate(() => new Date())
			.notNull()
	},
	(table) => [index('land_portions_user_idx').on(table.userId)]
);

export const landPortionsRelations = relations(landPortions, ({ one }) => ({
	owner: one(user, {
		fields: [landPortions.userId],
		references: [user.id]
	})
}));

// ==========================================
// 2. ASSOCIATE MEMBERS LINKING
// ==========================================
export const associates = sqliteTable(
	'associates',
	{
		id: text('id').primaryKey(),
		associateUserId: text('associate_user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		sponsoringMainPloUserId: text('sponsoring_main_plo_user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		relationship: text('relationship').notNull().default('family'), // 'family', 'co_owner', 'delegate'
		createdAt: integer('created_at', { mode: 'timestamp_ms' })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull()
	},
	(table) => [
		index('associates_associate_idx').on(table.associateUserId),
		index('associates_sponsor_idx').on(table.sponsoringMainPloUserId)
	]
);

export const associatesRelations = relations(associates, ({ one }) => ({
	associateUser: one(user, {
		fields: [associates.associateUserId],
		references: [user.id]
	}),
	sponsorUser: one(user, {
		fields: [associates.sponsoringMainPloUserId],
		references: [user.id]
	})
}));

// ==========================================
// 2.1 MEMBER INVITATIONS (PROFILE ASSOCIATE INVITES)
// ==========================================
export const invitations = sqliteTable(
	'invitations',
	{
		id: text('id').primaryKey(),
		email: text('email').notNull(),
		name: text('name'),
		relationship: text('relationship').notNull().default('family'), // 'family', 'co_owner', 'delegate'
		sponsoringMainPloUserId: text('sponsoring_main_plo_user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		token: text('token').notNull().unique(),
		status: text('status').notNull().default('pending'), // 'pending' | 'accepted' | 'expired' | 'revoked'
		expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
		acceptedAt: integer('accepted_at', { mode: 'timestamp_ms' }),
		createdAt: integer('created_at', { mode: 'timestamp_ms' })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull()
	},
	(table) => [
		index('invitations_token_idx').on(table.token),
		index('invitations_email_idx').on(table.email),
		index('invitations_sponsor_idx').on(table.sponsoringMainPloUserId)
	]
);

export const invitationsRelations = relations(invitations, ({ one }) => ({
	sponsorUser: one(user, {
		fields: [invitations.sponsoringMainPloUserId],
		references: [user.id]
	})
}));

// ==========================================
// 3. SHARED RESERVE CALENDAR
// ==========================================
export const calendarEntries = sqliteTable(
	'calendar_entries',
	{
		id: text('id').primaryKey(),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		startDate: text('start_date').notNull(), // ISO YYYY-MM-DD
		endDate: text('end_date').notNull(), // ISO YYYY-MM-DD
		purpose: text('purpose').notNull().default('leisure'), // 'hunting' | 'game_count' | 'maintenance' | 'leisure' | 'governance'
		notes: text('notes'),
		createdAt: integer('created_at', { mode: 'timestamp_ms' })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull(),
		updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.$onUpdate(() => new Date())
			.notNull()
	},
	(table) => [
		index('calendar_user_idx').on(table.userId),
		index('calendar_dates_idx').on(table.startDate, table.endDate)
	]
);

export const calendarEntriesRelations = relations(calendarEntries, ({ one }) => ({
	member: one(user, {
		fields: [calendarEntries.userId],
		references: [user.id]
	})
}));

// ==========================================
// 4. VOTING POLLS & BALLOTS
// ==========================================
export const votingPolls = sqliteTable(
	'voting_polls',
	{
		id: text('id').primaryKey(),
		title: text('title').notNull(),
		description: text('description').notNull(),
		status: text('status').notNull().default('draft'), // 'draft' | 'open' | 'closed'
		resolutionType: text('resolution_type').notNull().default('simple'), // 'simple' (>50%) | 'special' (>=75%)
		createdBy: text('created_by')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		closesAt: integer('closes_at', { mode: 'timestamp_ms' }),
		createdAt: integer('created_at', { mode: 'timestamp_ms' })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull(),
		closedAt: integer('closed_at', { mode: 'timestamp_ms' })
	},
	(table) => [
		index('voting_polls_status_idx').on(table.status),
		index('voting_polls_created_by_idx').on(table.createdBy)
	]
);

export const votes = sqliteTable(
	'votes',
	{
		id: text('id').primaryKey(),
		pollId: text('poll_id')
			.notNull()
			.references(() => votingPolls.id, { onDelete: 'cascade' }),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		choice: text('choice').notNull(), // 'agree' | 'disagree' | 'abstain'
		weightBps: integer('weight_bps').notNull().default(0), // Voter's weight in bps at time of vote
		votedAt: integer('voted_at', { mode: 'timestamp_ms' })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull()
	},
	(table) => [
		uniqueIndex('votes_poll_user_unique_idx').on(table.pollId, table.userId),
		index('votes_poll_idx').on(table.pollId)
	]
);

export const votingPollsRelations = relations(votingPolls, ({ one, many }) => ({
	creator: one(user, {
		fields: [votingPolls.createdBy],
		references: [user.id]
	}),
	votes: many(votes)
}));

export const votesRelations = relations(votes, ({ one }) => ({
	poll: one(votingPolls, {
		fields: [votes.pollId],
		references: [votingPolls.id]
	}),
	voter: one(user, {
		fields: [votes.userId],
		references: [user.id]
	})
}));

// ==========================================
// 5. AUDIT LOG (Immutable)
// ==========================================
export const auditLogs = sqliteTable(
	'audit_logs',
	{
		id: text('id').primaryKey(),
		userId: text('user_id').notNull(),
		userEmail: text('user_email').notNull(),
		roleAtTime: text('role_at_time').notNull(),
		actionType: text('action_type').notNull(), // 'USER_CREATED', 'PORTION_UPDATED', 'POLL_CREATED', etc.
		recordId: text('record_id'),
		recordType: text('record_type'),
		details: text('details'), // JSON payload
		timestamp: integer('timestamp', { mode: 'timestamp_ms' })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull()
	},
	(table) => [
		index('audit_user_idx').on(table.userId),
		index('audit_action_idx').on(table.actionType),
		index('audit_timestamp_idx').on(table.timestamp)
	]
);

// ==========================================
// 6. QUOTAS & ALLOCATIONS
// ==========================================
export const quotas = sqliteTable(
	'quotas',
	{
		id: text('id').primaryKey(),
		category: text('category').notNull().default('plo'), // 'ledet' | 'plo'
		subcategory: text('subcategory').notNull().default('hunting'), // 'hunting' | 'selling'
		species: text('species').notNull(), // 'Kudu' | 'Impala' | 'Blue Wildebeest' | 'Warthog' | 'Zebra' | 'Waterbuck' | 'Eland' | 'Gemsbok'
		totalAllocation: integer('total_allocation').notNull().default(0),
		unitPriceCents: integer('unit_price_cents').notNull().default(0), // in ZAR cents
		year: integer('year').notNull().default(2026),
		notes: text('notes'),
		createdAt: integer('created_at', { mode: 'timestamp_ms' })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull(),
		updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.$onUpdate(() => new Date())
			.notNull()
	},
	(table) => [
		index('quotas_category_year_idx').on(table.category, table.year),
		index('quotas_subcat_idx').on(table.subcategory),
		index('quotas_species_idx').on(table.species)
	]
);

export const quotaAllocations = sqliteTable(
	'quota_allocations',
	{
		id: text('id').primaryKey(),
		quotaId: text('quota_id')
			.notNull()
			.references(() => quotas.id, { onDelete: 'cascade' }),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		allocatedHead: integer('allocated_head').notNull().default(0),
		huntedHead: integer('hunted_head').notNull().default(0),
		openToBuyHead: integer('open_to_buy_head').notNull().default(0),
		createdAt: integer('created_at', { mode: 'timestamp_ms' })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull(),
		updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.$onUpdate(() => new Date())
			.notNull()
	},
	(table) => [
		uniqueIndex('quota_user_unique_idx').on(table.quotaId, table.userId),
		index('quota_alloc_user_idx').on(table.userId)
	]
);

export const huntingLogs = sqliteTable(
	'hunting_logs',
	{
		id: text('id').primaryKey(),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		quotaId: text('quota_id').references(() => quotas.id, { onDelete: 'set null' }),
		species: text('species').notNull(),
		headCount: integer('head_count').notNull().default(1),
		date: text('date').notNull(), // ISO YYYY-MM-DD
		hunterName: text('hunter_name').notNull(),
		firearmCaliber: text('firearm_caliber'),
		notes: text('notes'),
		createdAt: integer('created_at', { mode: 'timestamp_ms' })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull()
	},
	(table) => [
		index('hunting_logs_user_idx').on(table.userId),
		index('hunting_logs_date_idx').on(table.date)
	]
);

export const quotaTrades = sqliteTable(
	'quota_trades',
	{
		id: text('id').primaryKey(),
		sellerId: text('seller_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		buyerId: text('buyer_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		quotaId: text('quota_id')
			.notNull()
			.references(() => quotas.id, { onDelete: 'cascade' }),
		headCount: integer('head_count').notNull().default(1),
		priceCents: integer('price_cents').notNull().default(0),
		status: text('status').notNull().default('pending'), // 'pending' | 'completed' | 'cancelled'
		createdAt: integer('created_at', { mode: 'timestamp_ms' })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull(),
		completedAt: integer('completed_at', { mode: 'timestamp_ms' })
	},
	(table) => [
		index('quota_trades_seller_idx').on(table.sellerId),
		index('quota_trades_buyer_idx').on(table.buyerId)
	]
);

export const gameCounts = sqliteTable(
	'game_counts',
	{
		id: text('id').primaryKey(),
		date: text('date').notNull(), // ISO YYYY-MM-DD
		species: text('species').notNull(),
		count: integer('count').notNull().default(0),
		method: text('method').notNull().default('ground_transect'), // 'aerial_helicopter' | 'ground_transect' | 'waterhole_census'
		conductedBy: text('conducted_by').notNull(),
		notes: text('notes'),
		year: integer('year').notNull().default(2026),
		createdAt: integer('created_at', { mode: 'timestamp_ms' })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull()
	},
	(table) => [
		index('game_counts_year_species_idx').on(table.year, table.species),
		index('game_counts_date_idx').on(table.date)
	]
);

// Relations
export const quotasRelations = relations(quotas, ({ many }) => ({
	allocations: many(quotaAllocations),
	huntingLogs: many(huntingLogs),
	trades: many(quotaTrades)
}));

export const quotaAllocationsRelations = relations(quotaAllocations, ({ one }) => ({
	quota: one(quotas, {
		fields: [quotaAllocations.quotaId],
		references: [quotas.id]
	}),
	user: one(user, {
		fields: [quotaAllocations.userId],
		references: [user.id]
	})
}));

export const huntingLogsRelations = relations(huntingLogs, ({ one }) => ({
	hunter: one(user, {
		fields: [huntingLogs.userId],
		references: [user.id]
	}),
	quota: one(quotas, {
		fields: [huntingLogs.quotaId],
		references: [quotas.id]
	})
}));

export const quotaTradesRelations = relations(quotaTrades, ({ one }) => ({
	seller: one(user, {
		fields: [quotaTrades.sellerId],
		references: [user.id]
	}),
	buyer: one(user, {
		fields: [quotaTrades.buyerId],
		references: [user.id]
	}),
	quota: one(quotas, {
		fields: [quotaTrades.quotaId],
		references: [quotas.id]
	})
}));

// ==========================================
// 7. DOCUMENT VAULT
// ==========================================
export const documents = sqliteTable(
	'documents',
	{
		id: text('id').primaryKey(),
		title: text('title').notNull(),
		category: text('category').notNull().default('general'), // 'constitution' | 'agm_minutes' | 'ecological' | 'financial' | 'general'
		r2Key: text('r2_key').notNull(),
		fileName: text('file_name').notNull(),
		fileSize: integer('file_size').notNull().default(0), // bytes
		contentType: text('content_type').notNull().default('application/pdf'),
		sha256Hash: text('sha256_hash'),
		uploaderId: text('uploader_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		notes: text('notes'),
		createdAt: integer('created_at', { mode: 'timestamp_ms' })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull()
	},
	(table) => [
		index('documents_category_idx').on(table.category),
		index('documents_uploader_idx').on(table.uploaderId)
	]
);

export const documentsRelations = relations(documents, ({ one }) => ({
	uploader: one(user, {
		fields: [documents.uploaderId],
		references: [user.id]
	})
}));

// ==========================================
// 8. EXECUTIVE FINANCIAL RECORDS
// ==========================================
export const financialRecords = sqliteTable(
	'financial_records',
	{
		id: text('id').primaryKey(),
		accountName: text('account_name').notNull().default('Operating Account'), // 'Operating Account' | 'Reserve Capital Fund' | 'Boma Operations' | 'Emergency Anti-Poaching Fund'
		transactionType: text('transaction_type').notNull(), // 'levy_income' | 'boma_sales_revenue' | 'maintenance_expense' | 'anti_poaching' | 'legal_audit' | 'operational_expense'
		amountCents: integer('amount_cents').notNull().default(0), // Amount in ZAR cents
		description: text('description').notNull(),
		date: text('date').notNull(), // ISO YYYY-MM-DD
		createdBy: text('created_by')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		createdAt: integer('created_at', { mode: 'timestamp_ms' })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull()
	},
	(table) => [
		index('financial_account_idx').on(table.accountName),
		index('financial_type_idx').on(table.transactionType),
		index('financial_date_idx').on(table.date)
	]
);

export const financialRecordsRelations = relations(financialRecords, ({ one }) => ({
	author: one(user, {
		fields: [financialRecords.createdBy],
		references: [user.id]
	})
}));

// ==========================================
// 9. MASTER DATA: SPECIES REGISTER
// ==========================================
export const masterSpecies = sqliteTable(
	'master_species',
	{
		id: text('id').primaryKey(),
		name: text('name').notNull().unique(), // e.g. "Kudu", "Impala"
		category: text('category').notNull().default('plains_game'), // 'plains_game' | 'dangerous_game' | 'carnivore' | 'other'
		defaultPriceCents: integer('default_price_cents').notNull().default(0), // Indicative tariff in ZAR cents
		isActive: integer('is_active').notNull().default(1), // 1 = active, 0 = disabled
		createdAt: integer('created_at', { mode: 'timestamp_ms' })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull()
	},
	(table) => [index('master_species_name_idx').on(table.name)]
);

// ==========================================
// 10. MASTER DATA: VISIT CATEGORIES
// ==========================================
export const masterVisitCategories = sqliteTable(
	'master_visit_categories',
	{
		id: text('id').primaryKey(),
		key: text('key').notNull().unique(), // e.g. 'hunting', 'game_count', 'maintenance', 'leisure', 'governance'
		label: text('label').notNull(),
		colorHex: text('color_hex').notNull().default('#10b981'),
		badgeClass: text('badge_class').notNull().default('bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'),
		icon: text('icon').notNull().default('Compass'), // Lucide icon identifier (e.g. Crosshair, Binoculars, Wrench, Tent, etc.)
		description: text('description').notNull().default(''),
		isActive: integer('is_active').notNull().default(1),
		createdAt: integer('created_at', { mode: 'timestamp_ms' })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull()
	},
	(table) => [index('master_visit_cat_key_idx').on(table.key)]
);

// ==========================================
// 11. QUOTA BUY REQUESTS (Want-to-Buy from Peer PLOs)
// ==========================================
export const quotaBuyRequests = sqliteTable(
	'quota_buy_requests',
	{
		id: text('id').primaryKey(),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		species: text('species').notNull(),
		headCount: integer('head_count').notNull().default(1),
		offerPriceCents: integer('offer_price_cents').notNull().default(0), // ZAR cents per head offered
		notes: text('notes'),
		status: text('status').notNull().default('open'), // 'open' | 'fulfilled' | 'cancelled'
		fulfilledByUserId: text('fulfilled_by_user_id').references(() => user.id, { onDelete: 'set null' }),
		createdAt: integer('created_at', { mode: 'timestamp_ms' })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull(),
		fulfilledAt: integer('fulfilled_at', { mode: 'timestamp_ms' })
	},
	(table) => [
		index('quota_buy_user_idx').on(table.userId),
		index('quota_buy_status_idx').on(table.status),
		index('quota_buy_species_idx').on(table.species)
	]
);

export const quotaBuyRequestsRelations = relations(quotaBuyRequests, ({ one }) => ({
	requester: one(user, {
		fields: [quotaBuyRequests.userId],
		references: [user.id]
	}),
	fulfilledBy: one(user, {
		fields: [quotaBuyRequests.fulfilledByUserId],
		references: [user.id]
	})
}));



