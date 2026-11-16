import { drizzle } from 'drizzle-orm/d1';
import * as schema from './schema';

export * from './schema';
export { schema };

export const getDb = (d1: D1Database) => drizzle(d1, { schema });
export type AppDatabase = ReturnType<typeof getDb>;

// Inferred entity types
export type User = typeof schema.user.$inferSelect;
export type NewUser = typeof schema.user.$inferInsert;

export type Session = typeof schema.session.$inferSelect;
export type Account = typeof schema.account.$inferSelect;

export type LandPortion = typeof schema.landPortions.$inferSelect;
export type NewLandPortion = typeof schema.landPortions.$inferInsert;

export type Associate = typeof schema.associates.$inferSelect;
export type NewAssociate = typeof schema.associates.$inferInsert;

export type Invitation = typeof schema.invitations.$inferSelect;
export type NewInvitation = typeof schema.invitations.$inferInsert;

export type CalendarEntry = typeof schema.calendarEntries.$inferSelect;
export type NewCalendarEntry = typeof schema.calendarEntries.$inferInsert;

export type VotingPoll = typeof schema.votingPolls.$inferSelect;
export type NewVotingPoll = typeof schema.votingPolls.$inferInsert;

export type Vote = typeof schema.votes.$inferSelect;
export type NewVote = typeof schema.votes.$inferInsert;

export type AuditLog = typeof schema.auditLogs.$inferSelect;
export type NewAuditLog = typeof schema.auditLogs.$inferInsert;

export type Quota = typeof schema.quotas.$inferSelect;
export type NewQuota = typeof schema.quotas.$inferInsert;

export type QuotaAllocation = typeof schema.quotaAllocations.$inferSelect;
export type NewQuotaAllocation = typeof schema.quotaAllocations.$inferInsert;

export type HuntingLog = typeof schema.huntingLogs.$inferSelect;
export type NewHuntingLog = typeof schema.huntingLogs.$inferInsert;

export type QuotaTrade = typeof schema.quotaTrades.$inferSelect;
export type NewQuotaTrade = typeof schema.quotaTrades.$inferInsert;

export type GameCount = typeof schema.gameCounts.$inferSelect;
export type NewGameCount = typeof schema.gameCounts.$inferInsert;

export type Document = typeof schema.documents.$inferSelect;
export type NewDocument = typeof schema.documents.$inferInsert;

export type FinancialRecord = typeof schema.financialRecords.$inferSelect;
export type NewFinancialRecord = typeof schema.financialRecords.$inferInsert;

export type MasterSpecies = typeof schema.masterSpecies.$inferSelect;
export type NewMasterSpecies = typeof schema.masterSpecies.$inferInsert;

export type MasterVisitCategory = typeof schema.masterVisitCategories.$inferSelect;
export type NewMasterVisitCategory = typeof schema.masterVisitCategories.$inferInsert;

export type QuotaBuyRequest = typeof schema.quotaBuyRequests.$inferSelect;
export type NewQuotaBuyRequest = typeof schema.quotaBuyRequests.$inferInsert;

