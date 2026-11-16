import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getDb } from '$lib/server/db';
import { hasAnyRole } from '$lib/auth/roles';

export const load: PageServerLoad = async ({ locals, platform }) => {
	if (!locals.user || !hasAnyRole(locals.user.roles, ['secretary'])) {
		throw error(403, 'Access Denied: The Secretary role is strictly required to view the Audit Trail.');
	}

	if (!platform?.env?.DB) {
		return {
			user: locals.user,
			auditLogs: []
		};
	}

	const db = getDb(platform.env.DB);

	const auditLogs = await db.query.auditLogs.findMany({
		orderBy: (al, { desc }) => [desc(al.timestamp)],
		limit: 250
	});

	return {
		user: locals.user,
		auditLogs
	};
};
