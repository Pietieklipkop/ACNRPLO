import { redirect } from '@sveltejs/kit';
import type { Actions } from './$types';

export const actions: Actions = {
	default: async ({ locals, request, setHeaders }) => {
		if (locals.auth) {
			try {
				await locals.auth.api.signOut({
					headers: request.headers
				});
			} catch (err) {
				// Continue redirect even if sign out call errors
			}
		}
		setHeaders({
			'Clear-Site-Data': '"cache"',
			'Cache-Control': 'private, no-cache, no-store, must-revalidate, max-age=0'
		});
		throw redirect(303, '/login');
	}
};
