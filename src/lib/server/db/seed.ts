import type { AppAuth } from '$lib/server/auth';
import { getDb, schema } from '$lib/server/db';
import { eq, and, or } from 'drizzle-orm';
import { hashPassword } from 'better-auth/crypto';
import type { UserRole } from '$lib/auth/roles';
import { PLO_MEMBER_PALETTE } from '$lib/constants/member-colors';

export interface SeedUserDef {
	name: string;
	email: string;
	username: string;
	password: string;
	roles: UserRole[];
	phone: string;
	color?: string;
	portion?: {
		name: string;
		hectares: number;
		ownershipBps: number;
		voteBps: number;
	};
	sponsorUsername?: string;
}

export const SEED_USERS: SeedUserDef[] = [
	{
		name: 'Stefan van Dyk (Secretary)',
		email: 'stefan@dialogdev.net',
		username: 'secretary',
		password: 'Welcome@1!',
		roles: ['secretary', 'executive'],
		phone: '+27 82 111 2222',
		color: '#7c3aed'
		// Secretary does not hold any land ownership portion
	},
	{
		name: 'Willem Fourie (Main PLO)',
		email: 'willem@scholtzrad.co.za',
		username: 'willem',
		password: 'Welcome@1!',
		roles: ['main_plo'],
		phone: '+27 83 222 3333',
		color: '#2563eb',
		portion: {
			name: 'Groengoud',
			hectares: 1035,
			ownershipBps: 1035, // 10.35%
			voteBps: 1035
		}
	},
	{
		name: 'Des F (Main PLO)',
		email: 'desf@insurancezone.co.za',
		username: 'desf',
		password: 'Welcome@1!',
		roles: ['main_plo'],
		phone: '+27 84 333 4444',
		color: '#059669',
		portion: {
			name: 'Frankfort',
			hectares: 1000,
			ownershipBps: 1000, // 10.00%
			voteBps: 1000
		}
	}
];

export const OTHER_RESERVE_PORTIONS = [
	{
		name: 'Portion 1 (Rhenosterpan)',
		hectares: 2545,
		ownershipBps: 2545, // 25.45%
		voteBps: 2545,
		notes: 'Cadastral Portion (Brakwater Trust)'
	},
	{
		name: 'Portion 2 (Buffelshoek)',
		hectares: 2150,
		ownershipBps: 2150, // 21.50%
		voteBps: 2150,
		notes: 'Cadastral Portion (Kameel Trust)'
	},
	{
		name: 'Portion 3 (Kruispad)',
		hectares: 1820,
		ownershipBps: 1820, // 18.20%
		voteBps: 1820,
		notes: 'Cadastral Portion (Mopani Syndicate)'
	},
	{
		name: 'Portion 4 (Brakpan)',
		hectares: 1450,
		ownershipBps: 1450, // 14.50%
		voteBps: 1450,
		notes: 'Cadastral Portion (Zandfontein Trust)'
	}
];

let isSeededInMemory = false;

/**
 * Bootstraps accounts for each role and seeds the entire database with realistic reserve data.
 */
export async function ensureSeedData(auth: AppAuth, d1: D1Database) {
	if (isSeededInMemory) return;
	const db = getDb(d1);

	try {
		// Ensure invitations table exists in D1
		try {
			await d1.exec(`
				CREATE TABLE IF NOT EXISTS invitations (
					id text PRIMARY KEY NOT NULL,
					email text NOT NULL,
					name text,
					relationship text DEFAULT 'family' NOT NULL,
					sponsoring_main_plo_user_id text NOT NULL,
					token text NOT NULL UNIQUE,
					status text DEFAULT 'pending' NOT NULL,
					expires_at integer NOT NULL,
					accepted_at integer,
					created_at integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
					FOREIGN KEY (sponsoring_main_plo_user_id) REFERENCES user(id) ON UPDATE no action ON DELETE cascade
				);
				CREATE INDEX IF NOT EXISTS invitations_token_idx ON invitations (token);
				CREATE INDEX IF NOT EXISTS invitations_email_idx ON invitations (email);
				CREATE INDEX IF NOT EXISTS invitations_sponsor_idx ON invitations (sponsoring_main_plo_user_id);
			`);
		} catch (tableErr) {
			console.warn('Could not auto-create invitations table (might already exist):', tableErr);
		}

		// Fast path: if the target configuration is already active in D1, avoid re-running heavy seeding
		const hasGroengoud = await db.query.landPortions.findFirst({
			where: eq(schema.landPortions.portionName, 'Groengoud')
		});
		const targetWillem = await db.query.user.findFirst({
			where: eq(schema.user.email, 'willem@scholtzrad.co.za')
		});

		if (hasGroengoud && targetWillem) {
			isSeededInMemory = true;
			return;
		}

		// 1. Initial bootstrap if Groengoud portion doesn't exist
		if (!hasGroengoud) {
			console.log('Synchronizing user accounts and land portions to the target testing configuration...');
			// First delete dependent child tables to prevent foreign key constraint violations
			await db.delete(schema.votes);
			await db.delete(schema.votingPolls);
			await db.delete(schema.quotaBuyRequests);
			await db.delete(schema.quotaTrades);
			await db.delete(schema.quotaAllocations);
			await db.delete(schema.quotas);
			await db.delete(schema.huntingLogs);
			await db.delete(schema.calendarEntries);
			await db.delete(schema.documents);
			await db.delete(schema.gameCounts);
			await db.delete(schema.financialRecords);
			await db.delete(schema.invitations);
			await db.delete(schema.associates);
			await db.delete(schema.landPortions);
			await db.delete(schema.auditLogs);
			await db.delete(schema.session);
			await db.delete(schema.account);

			const targetEmails = SEED_USERS.map((u) => u.email.toLowerCase());
			const allExistingUsers = await db.query.user.findMany();

			for (const u of allExistingUsers) {
				if (!targetEmails.includes(u.email.toLowerCase())) {
					await db.delete(schema.user).where(eq(schema.user.id, u.id));
				}
			}
		}

		// 2. Seed / Synchronize the 3 Accounts
		const userMap = new Map<string, string>(); // username -> userId

		for (const uDef of SEED_USERS) {
			const existingUser = await db.query.user.findFirst({
				where: or(eq(schema.user.email, uDef.email.toLowerCase()), eq(schema.user.username, uDef.username))
			});

			let userId = existingUser?.id;

			if (!existingUser) {
				try {
					const res = await auth.api.signUpEmail({
						body: {
							name: uDef.name,
							email: uDef.email,
							password: uDef.password,
							username: uDef.username,
							phone: uDef.phone
						}
					});

					if (res?.user) {
						userId = res.user.id;
						await db
							.update(schema.user)
							.set({
								roles: JSON.stringify(uDef.roles),
								status: 'active'
							})
							.where(eq(schema.user.id, userId));
					}
				} catch (signupErr) {
					console.warn(`Sign up warning for ${uDef.username}:`, signupErr);
				}
			} else {
				// Ensure roles, name, status, and email are aligned
				await db
					.update(schema.user)
					.set({
						name: uDef.name,
						email: uDef.email,
						roles: JSON.stringify(uDef.roles),
						status: 'active',
						phone: uDef.phone,
						color: uDef.color || null
					})
					.where(eq(schema.user.id, existingUser.id));

				// Guarantee password hash matches Welcome@1!
				try {
					const newPasswordHash = await hashPassword(uDef.password);
					const existingAccount = await db.query.account.findFirst({
						where: and(
							eq(schema.account.userId, existingUser.id),
							eq(schema.account.providerId, 'credential')
						)
					});

					if (!existingAccount) {
						await db.insert(schema.account).values({
							id: crypto.randomUUID(),
							accountId: existingUser.id,
							providerId: 'credential',
							userId: existingUser.id,
							password: newPasswordHash,
							createdAt: new Date(),
							updatedAt: new Date()
						});
					} else {
						await db
							.update(schema.account)
							.set({ password: newPasswordHash })
							.where(eq(schema.account.id, existingAccount.id));
					}
				} catch (pwErr) {
					console.warn(`Password update warning for ${uDef.username}:`, pwErr);
				}
			}

			if (userId) {
				userMap.set(uDef.username, userId);
			}
		}

		// 3. Seed Land Portions (Total invariant = 10,000 bps = 100.00%)
		for (const uDef of SEED_USERS) {
			if (!uDef.portion) continue;
			const userId = userMap.get(uDef.username);
			if (!userId) continue;

			const existingPortion = await db.query.landPortions.findFirst({
				where: eq(schema.landPortions.portionName, uDef.portion.name)
			});

			if (!existingPortion) {
				await db.insert(schema.landPortions).values({
					id: crypto.randomUUID(),
					userId,
					portionName: uDef.portion.name,
					hectares: uDef.portion.hectares,
					ownershipBps: uDef.portion.ownershipBps,
					voteAllocationBps: uDef.portion.voteBps,
					status: 'active',
					notes: `Surveyed cadastral boundary for ${uDef.name}`
				});
			} else {
				await db
					.update(schema.landPortions)
					.set({
						userId,
						hectares: uDef.portion.hectares,
						ownershipBps: uDef.portion.ownershipBps,
						voteAllocationBps: uDef.portion.voteBps,
						status: 'active'
					})
					.where(eq(schema.landPortions.id, existingPortion.id));
			}
		}

		// Seed remaining reserve portions (7,965 bps / 79.65% to complete 10,000 bps invariant)
		for (const oPortion of OTHER_RESERVE_PORTIONS) {
			const existing = await db.query.landPortions.findFirst({
				where: eq(schema.landPortions.portionName, oPortion.name)
			});

			if (!existing) {
				await db.insert(schema.landPortions).values({
					id: crypto.randomUUID(),
					userId: null,
					portionName: oPortion.name,
					hectares: oPortion.hectares,
					ownershipBps: oPortion.ownershipBps,
					voteAllocationBps: oPortion.voteBps,
					status: 'active',
					notes: oPortion.notes
				});
			} else {
				await db
					.update(schema.landPortions)
					.set({
						userId: null,
						hectares: oPortion.hectares,
						ownershipBps: oPortion.ownershipBps,
						voteAllocationBps: oPortion.voteBps,
						status: 'active',
						notes: oPortion.notes
					})
					.where(eq(schema.landPortions.id, existing.id));
			}
		}

		// 4. Seed Calendar Entries
		const existingCalendar = await db.select().from(schema.calendarEntries).limit(1);
		if (existingCalendar.length === 0) {
			const today = new Date();
			const addDays = (d: number) => {
				const date = new Date(today);
				date.setDate(date.getDate() + d);
				return date.toISOString().split('T')[0];
			};

			const bookings = [
				{
					id: crypto.randomUUID(),
					userId: userMap.get('willem') || '',
					startDate: addDays(4),
					endDate: addDays(7),
					purpose: 'hunting',
					notes: 'Annual family trophy kudu hunt, 2 rifles at Groengoud Camp'
				},
				{
					id: crypto.randomUUID(),
					userId: userMap.get('secretary') || '',
					startDate: addDays(9),
					endDate: addDays(11),
					purpose: 'maintenance',
					notes: 'Northern smart electric fence energizer inspection and firebreak grading'
				},
				{
					id: crypto.randomUUID(),
					userId: userMap.get('desf') || '',
					startDate: addDays(15),
					endDate: addDays(18),
					purpose: 'leisure',
					notes: 'Family weekend and photography at Frankfort bush camp'
				}
			].filter((b) => Boolean(b.userId));

			if (bookings.length > 0) {
				await db.insert(schema.calendarEntries).values(bookings);
			}
		}

		// 5. Seed Quotas & Allocations
		const existingQuotas = await db.select().from(schema.quotas).limit(1);
		if (existingQuotas.length === 0) {
			const quotaDefs = [
				{ species: 'Kudu', totalAllocation: 20, unitPriceCents: 850000, category: 'plo', subcategory: 'hunting' },
				{ species: 'Impala', totalAllocation: 60, unitPriceCents: 220000, category: 'plo', subcategory: 'hunting' },
				{ species: 'Blue Wildebeest', totalAllocation: 25, unitPriceCents: 580000, category: 'plo', subcategory: 'hunting' },
				{ species: 'Warthog', totalAllocation: 30, unitPriceCents: 150000, category: 'plo', subcategory: 'hunting' },
				{ species: 'Eland', totalAllocation: 10, unitPriceCents: 1800000, category: 'plo', subcategory: 'selling' },
				{ species: 'Impala', totalAllocation: 40, unitPriceCents: 220000, category: 'ledet', subcategory: 'hunting' },
				{ species: 'Blue Wildebeest', totalAllocation: 15, unitPriceCents: 620000, category: 'ledet', subcategory: 'selling' }
			];

			for (const qDef of quotaDefs) {
				const quotaId = crypto.randomUUID();
				await db.insert(schema.quotas).values({
					id: quotaId,
					category: qDef.category,
					subcategory: qDef.subcategory,
					species: qDef.species,
					totalAllocation: qDef.totalAllocation,
					unitPriceCents: qDef.unitPriceCents,
					year: 2026,
					notes: `Official 2026 Ecological Carrying Capacity allocation for ${qDef.species} (${qDef.category.toUpperCase()} ${qDef.subcategory.toUpperCase()})`
				});

				// Proportional Allocations by Landowner BPS
				// willem: 10.35%, desf: 10.00% (secretary has no land portion / 0%)
				const memberShares = [
					{ username: 'willem', shareBps: 1035, hunted: 1, openToBuy: 1 },
					{ username: 'desf', shareBps: 1000, hunted: 1, openToBuy: 1 }
				];

				for (const ms of memberShares) {
					const uId = userMap.get(ms.username);
					if (!uId) continue;
					const allocated = Math.round((ms.shareBps / 10000) * qDef.totalAllocation);
					await db.insert(schema.quotaAllocations).values({
						id: crypto.randomUUID(),
						quotaId,
						userId: uId,
						allocatedHead: allocated,
						huntedHead: Math.min(ms.hunted, allocated),
						openToBuyHead: ms.openToBuy
					});
				}
			}
		}

		// 6. Seed Voting Polls & Live Ballots
		const existingPolls = await db.select().from(schema.votingPolls).limit(1);
		if (existingPolls.length === 0) {
			const secretaryId = userMap.get('secretary');
			if (secretaryId) {
				// Open Poll
				const openPollId = crypto.randomUUID();
				const closeDate = new Date();
				closeDate.setDate(closeDate.getDate() + 10);

				await db.insert(schema.votingPolls).values({
					id: openPollId,
					title: '2026 Reserve Electrification & Smart Perimeter Fencing Upgrade',
					description:
						'Motion to allocate R 240,000 from the Reserve Capital Fund to install IoT voltage telemetry and solar energizers across the 42km western perimeter boundary fence to curb illegal incursions.',
					status: 'open',
					resolutionType: 'simple',
					createdBy: secretaryId,
					closesAt: closeDate
				});

				// Seed initial vote for Open Poll
				const willemId = userMap.get('willem');
				if (willemId) {
					await db.insert(schema.votes).values({
						id: crypto.randomUUID(),
						pollId: openPollId,
						userId: willemId,
						choice: 'agree',
						weightBps: 1035
					});
				}

				// Closed Poll with Full Audit
				const closedPollId = crypto.randomUUID();
				await db.insert(schema.votingPolls).values({
					id: closedPollId,
					title: 'Ratification of Annual Ecological Off-Take Tariff Structure 2026',
					description:
						'Formal ratification of the 2026 game off-take tariffs (Kudu R8,500, Impala R2,200, Blue Wildebeest R5,800, Eland R18,000) based on the provincial ecological assessment.',
					status: 'closed',
					resolutionType: 'special',
					createdBy: secretaryId,
					closedAt: new Date()
				});

				// Ballots for Closed Poll
				const ballots = [
					{ username: 'willem', choice: 'agree', weightBps: 1035 },
					{ username: 'desf', choice: 'agree', weightBps: 1000 }
				];

				for (const b of ballots) {
					const uId = userMap.get(b.username);
					if (uId) {
						await db.insert(schema.votes).values({
							id: crypto.randomUUID(),
							pollId: closedPollId,
							userId: uId,
							choice: b.choice,
							weightBps: b.weightBps
						});
					}
				}
			}
		}

		// 7. Seed Game Census Records
		const existingCensus = await db.select().from(schema.gameCounts).limit(1);
		if (existingCensus.length === 0) {
			const censusRecords = [
				{ species: 'Kudu', count: 142, method: 'aerial_helicopter', notes: 'Concentration near Rhenosterpan waterholes' },
				{ species: 'Impala', count: 480, method: 'ground_transect', notes: 'Healthy herds across Kruispad and Buffelshoek plains' },
				{ species: 'Blue Wildebeest', count: 210, method: 'ground_transect', notes: 'Vigorous recruitment rate' },
				{ species: 'Giraffe', count: 34, method: 'aerial_helicopter', notes: 'All adult and sub-adult cows healthy' },
				{ species: 'White Rhino', count: 8, method: 'ground_transect', notes: 'APU full visual verification, dehorned & tracked' }
			];

			for (const c of censusRecords) {
				await db.insert(schema.gameCounts).values({
					id: crypto.randomUUID(),
					date: '2026-03-01',
					species: c.species,
					count: c.count,
					method: c.method,
					conductedBy: 'Dr. Kobus Venter (Senior Wildlife Ecologist)',
					notes: c.notes,
					year: 2026
				});
			}
		}

		// 8. Seed Document Vault
		const existingDocs = await db.select().from(schema.documents).limit(1);
		if (existingDocs.length === 0) {
			const secId = userMap.get('secretary') || 'system';
			const docs = [
				{
					title: 'Atherstone Collaborative Nature Reserve Constitution (2026 Revision)',
					category: 'constitution',
					fileName: 'ACNR_Constitution_2026_Approved.pdf',
					fileSize: 1845200,
					sha256Hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
					notes: 'Ratified by special resolution of the private landowners assembly'
				},
				{
					title: 'ACNRPLO 2025 Annual General Meeting Approved Minutes',
					category: 'agm_minutes',
					fileName: 'ACNRPLO_AGM_Minutes_2025.pdf',
					fileSize: 842100,
					sha256Hash: '8f434346648f6b96df89dda901c5176b10a6d83961dd3c1ac88b59b2dc327aa4',
					notes: 'Signed by Stefan van Dyk and executive committee members'
				},
				{
					title: '2026 Ecological Carrying Capacity & Game Off-Take Recommendation',
					category: 'ecological',
					fileName: 'ACNR_Ecological_Assessment_2026.pdf',
					fileSize: 3420000,
					sha256Hash: 'a591a6d40bf420404a011733cfb7b190d62c65bf0bcda32b57b277d9ad9f146e',
					notes: 'Limpopo Department of Economic Development, Environment and Tourism (LEDET)'
				}
			];

			for (const d of docs) {
				await db.insert(schema.documents).values({
					id: crypto.randomUUID(),
					title: d.title,
					category: d.category,
					r2Key: `seeded/${d.fileName}`,
					fileName: d.fileName,
					fileSize: d.fileSize,
					contentType: 'application/pdf',
					sha256Hash: d.sha256Hash,
					uploaderId: secId,
					notes: d.notes
				});
			}
		}

		// 9. Seed Financial Records
		const secId = userMap.get('secretary') || 'system';
		await ensureDefaultFinancialRecords(d1, secId);

		// 10. Seed Initial System Audit Log
		const existingAudit = await db.select().from(schema.auditLogs).limit(1);
		if (existingAudit.length === 0) {
			await db.insert(schema.auditLogs).values({
				id: crypto.randomUUID(),
				userId: secId,
				userEmail: 'stefan@dialogdev.net',
				roleAtTime: 'secretary',
				actionType: 'SYSTEM_BOOTSTRAP',
				recordType: 'system',
				recordId: 'init-2026',
				details: JSON.stringify({
					status: 'Bootstrapped',
					seededPortions: 3,
					totalCapacityBps: 10000,
					seededMembers: SEED_USERS.map((u) => ({ username: u.username, roles: u.roles }))
				}),
				timestamp: new Date()
			});
		}

		// 11. Seed Master Data (Species and Visit Categories)
		await ensureMasterData(d1);

		// 12. Seed Quota Acquisition Requests (Want-to-Buy from Peer PLOs)
		const existingBuyRequests = await db.select().from(schema.quotaBuyRequests).limit(1);
		if (existingBuyRequests.length === 0) {
			const willemUserId = userMap.get('willem');
			if (willemUserId) {
				await db.insert(schema.quotaBuyRequests).values({
					id: crypto.randomUUID(),
					userId: willemUserId,
					species: 'Kudu',
					headCount: 2,
					offerPriceCents: 850000, // R8,500 per head
					notes: 'Looking to acquire 2 additional trophy bulls for visiting family excursion in late July.',
					status: 'open'
				});
			}
		}
	} catch (err) {
		console.error('Failed to execute complete seed:', err);
	}
}


/**
 * Ensures initial realistic baseline financial records exist for the Executive committee
 */
export async function ensureDefaultFinancialRecords(d1: D1Database, creatorUserId: string) {
	const db = getDb(d1);
	try {
		const existing = await db.select().from(schema.financialRecords).limit(1);
		if (existing.length > 0) return;

		const records = [
			{
				id: crypto.randomUUID(),
				accountName: 'Operating Account',
				transactionType: 'levy_income',
				amountCents: 45000000, // R450,000.00
				description: '2026 Annual Member Operational Levies (Q1 Invoiced & Settled)',
				date: '2026-01-15',
				createdBy: creatorUserId
			},
			{
				id: crypto.randomUUID(),
				accountName: 'Reserve Capital Fund',
				transactionType: 'levy_income',
				amountCents: 50000000, // R500,000.00
				description: 'Capital Reserve Infrastructure Endowment Fund',
				date: '2026-01-20',
				createdBy: creatorUserId
			},
			{
				id: crypto.randomUUID(),
				accountName: 'Operating Account',
				transactionType: 'maintenance_expense',
				amountCents: -6850000, // -R68,500.00
				description: 'Perimeter Smart Fence Energizers & Firebreak Road Grading',
				date: '2026-02-05',
				createdBy: creatorUserId
			},
			{
				id: crypto.randomUUID(),
				accountName: 'Emergency Anti-Poaching Fund',
				transactionType: 'anti_poaching',
				amountCents: -11500000, // -R115,000.00
				description: 'APU Tactical Patrols, Night-Vision Optics & Aviation Fuel',
				date: '2026-02-18',
				createdBy: creatorUserId
			},
			{
				id: crypto.randomUUID(),
				accountName: 'Boma Operations',
				transactionType: 'boma_sales_revenue',
				amountCents: 32000000, // R320,000.00
				description: 'Annual Live Game Auction (Boma Off-Take - Surplus Eland & Gemsbok)',
				date: '2026-03-01',
				createdBy: creatorUserId
			},
			{
				id: crypto.randomUUID(),
				accountName: 'Operating Account',
				transactionType: 'legal_audit',
				amountCents: -3450000, // -R34,500.00
				description: 'Annual Constitutional Review & Provincial Ecological Compliance Audit',
				date: '2026-03-10',
				createdBy: creatorUserId
			}
		];

		await db.insert(schema.financialRecords).values(records);
	} catch (err) {
		console.error('Failed to seed default financial records:', err);
	}
}

let isMasterDataSeededInMemory = false;

/**
 * Ensures baseline master data exists: Master Species and Master Visit Categories
 */
export async function ensureMasterData(d1: D1Database) {
	if (isMasterDataSeededInMemory) return;
	const db = getDb(d1);

	try {
		// 1. Master Species
		const existingSpecies = await db.select().from(schema.masterSpecies).limit(1);
		if (existingSpecies.length === 0) {
			const speciesList = [
				{ name: 'Kudu', category: 'plains_game', defaultPriceCents: 850000 },
				{ name: 'Impala', category: 'plains_game', defaultPriceCents: 220000 },
				{ name: 'Blue Wildebeest', category: 'plains_game', defaultPriceCents: 580000 },
				{ name: 'Warthog', category: 'plains_game', defaultPriceCents: 150000 },
				{ name: 'Eland', category: 'plains_game', defaultPriceCents: 1800000 },
				{ name: 'Zebra', category: 'plains_game', defaultPriceCents: 650000 },
				{ name: 'Waterbuck', category: 'plains_game', defaultPriceCents: 950000 },
				{ name: 'Giraffe', category: 'other', defaultPriceCents: 1500000 },
				{ name: 'White Rhino', category: 'dangerous_game', defaultPriceCents: 0 },
				{ name: 'Gemsbok', category: 'plains_game', defaultPriceCents: 750000 }
			];

			for (const sp of speciesList) {
				await db.insert(schema.masterSpecies).values({
					id: crypto.randomUUID(),
					name: sp.name,
					category: sp.category,
					defaultPriceCents: sp.defaultPriceCents,
					isActive: 1
				});
			}
		}

		// 2. Master Visit Categories
		const existingCategories = await db.select().from(schema.masterVisitCategories).limit(1);
		if (existingCategories.length === 0) {
			const categoriesList = [
				{
					key: 'hunting',
					label: 'Hunting Excursion',
					icon: 'Crosshair',
					colorHex: '#059669',
					badgeClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300/60 dark:border-emerald-700/60',
					description: 'Regulated quota hunting off-take'
				},
				{
					key: 'game_count',
					label: 'Game Count / Census',
					icon: 'Binoculars',
					colorHex: '#d97706',
					badgeClass: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300/60 dark:border-amber-700/60',
					description: 'Ecological census & species monitoring'
				},
				{
					key: 'maintenance',
					label: 'Reserve Maintenance',
					icon: 'Wrench',
					colorHex: '#ea580c',
					badgeClass: 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300 border border-orange-300/60 dark:border-orange-700/60',
					description: 'Fences, waterholes, roads & infrastructure'
				},
				{
					key: 'leisure',
					label: 'Leisure & Eco Stay',
					icon: 'Tent',
					colorHex: '#0284c7',
					badgeClass: 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300 border border-sky-300/60 dark:border-sky-700/60',
					description: 'Landowner relaxation & camp accommodation'
				},
				{
					key: 'governance',
					label: 'Governance & AGM',
					icon: 'HeartHandshake',
					colorHex: '#4f46e5',
					badgeClass: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-300/60 dark:border-indigo-700/60',
					description: 'PLO committee, executive & landowner meetings'
				}
			];

			for (const cat of categoriesList) {
				await db.insert(schema.masterVisitCategories).values({
					id: crypto.randomUUID(),
					key: cat.key,
					label: cat.label,
					icon: cat.icon,
					colorHex: cat.colorHex,
					badgeClass: cat.badgeClass,
					description: cat.description,
					isActive: 1
				});
			}
		}

		// 3. Ensure all existing categories have an assigned icon
		const allCategories = await db.query.masterVisitCategories.findMany();
		for (const cat of allCategories) {
			if (!cat.icon) {
				const defIcon =
					cat.key === 'hunting'
						? 'Crosshair'
						: cat.key === 'game_count'
							? 'Binoculars'
							: cat.key === 'maintenance'
								? 'Wrench'
								: cat.key === 'leisure'
									? 'Tent'
									: cat.key === 'governance'
										? 'HeartHandshake'
										: 'Compass';
				await db
					.update(schema.masterVisitCategories)
					.set({ icon: defIcon })
					.where(eq(schema.masterVisitCategories.id, cat.id));
			}
		}

		// 4. Ensure all existing users have an assigned PLO member color
		const allUsers = await db.query.user.findMany({
			orderBy: (u, { asc }) => [asc(u.createdAt)]
		});
		for (let i = 0; i < allUsers.length; i++) {
			const u = allUsers[i];
			if (!u.color) {
				const assigned = PLO_MEMBER_PALETTE[i % PLO_MEMBER_PALETTE.length];
				await db.update(schema.user).set({ color: assigned }).where(eq(schema.user.id, u.id));
			}
		}
	} catch (err) {
		console.error('Failed to seed master data:', err);
	}
}

