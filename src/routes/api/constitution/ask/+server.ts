import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { queryConstitutionAssistant } from '$lib/server/ai/constitution';

export const POST: RequestHandler = async ({ request, locals, platform }) => {
	if (!locals.user) {
		throw error(401, 'Authentication required');
	}

	const body = (await request.json().catch(() => ({}))) as { question?: string };
	const question = body.question?.toString().trim();

	if (!question) {
		return json({ error: 'Please provide a valid question.' }, { status: 400 });
	}

	try {
		const result = await queryConstitutionAssistant(question, platform?.env?.AI);
		return json({
			success: true,
			answer: result.answer,
			citations: result.citations
		});
	} catch (err: any) {
		console.error('Constitution AI error:', err);
		return json(
			{
				error: 'Failed to generate constitutional response. Please retry.'
			},
			{ status: 500 }
		);
	}
};
