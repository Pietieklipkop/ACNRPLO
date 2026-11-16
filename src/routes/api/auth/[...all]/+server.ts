import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ request, locals }) => {
	return locals.auth.handler(request);
};

export const POST: RequestHandler = async ({ request, locals }) => {
	return locals.auth.handler(request);
};
