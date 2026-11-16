import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { CONSTITUTION_ARTICLES } from '$lib/server/ai/constitution';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		throw redirect(303, '/login');
	}

	return {
		user: locals.user,
		articles: CONSTITUTION_ARTICLES
	};
};
