import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	const tab = url.searchParams.get('tab');
	if (tab === 'polls') throw redirect(301, '/admin/polls');
	if (tab === 'finance') throw redirect(301, '/admin/finance');
	if (tab === 'audit') throw redirect(301, '/admin/audit');
	if (tab === 'master-data') throw redirect(301, '/admin/master-data');
	throw redirect(301, '/admin/members');
};
