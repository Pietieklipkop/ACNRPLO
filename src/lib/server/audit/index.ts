import { getDb, schema } from '$lib/server/db';

export interface AuditEventParams {
	userId: string;
	userEmail: string;
	roleAtTime: string;
	actionType: string;
	recordId?: string;
	recordType?: string;
	details?: Record<string, any>;
}

/**
 * Appends an immutable record to the audit_logs table
 */
export async function logAuditEvent(d1: D1Database, params: AuditEventParams) {
	try {
		const db = getDb(d1);
		await db.insert(schema.auditLogs).values({
			id: crypto.randomUUID(),
			userId: params.userId,
			userEmail: params.userEmail,
			roleAtTime: params.roleAtTime,
			actionType: params.actionType,
			recordId: params.recordId,
			recordType: params.recordType,
			details: params.details ? JSON.stringify(params.details) : null,
			timestamp: new Date()
		});
	} catch (err) {
		console.error('Failed to append audit record:', err);
	}
}
