import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const token = params.token;
	throw redirect(303, `/set-password?token=${encodeURIComponent(token)}`);
};
