import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { getDb, schema } from '$lib/server/db';
import { eq, desc } from 'drizzle-orm';
import { logAuditEvent } from '$lib/server/audit';
import { hasAnyRole } from '$lib/auth/roles';

export const load: PageServerLoad = async ({ locals, platform }) => {
	if (!locals.user) {
		throw redirect(303, '/login');
	}

	const currentUser = locals.user;
	const isSecretary = currentUser.roles.includes('secretary');
	const canUpload = hasAnyRole(currentUser.roles, ['main_plo', 'executive', 'secretary']);

	if (!platform?.env?.DB) {
		return {
			user: currentUser,
			documents: [],
			canUpload,
			isSecretary
		};
	}

	const db = getDb(platform.env.DB);

	let rawDocs = await db.query.documents.findMany({
		orderBy: (d, { desc }) => [desc(d.createdAt)],
		with: {
			uploader: true
		}
	});

	// Seed baseline official documents if empty
	if (rawDocs.length === 0 && isSecretary) {
		const baselineDocs = [
			{
				title: 'Atherstone PLO Constitution (2024 Revision)',
				category: 'constitution',
				r2Key: 'docs/acnr_constitution_2024.pdf',
				fileName: 'ACNR_Constitution_2024.pdf',
				fileSize: 2450000,
				contentType: 'application/pdf',
				notes: 'Official codified constitution governing share-weighted voting, land portions, and quotas.'
			},
			{
				title: 'ACNR Annual General Meeting (AGM) Minutes — November 2025',
				category: 'agm_minutes',
				r2Key: 'docs/acnr_agm_minutes_nov2025.pdf',
				fileName: 'ACNR_AGM_Minutes_Nov2025.pdf',
				fileSize: 850000,
				contentType: 'application/pdf',
				notes: 'Official recorded minutes, executive resolutions, and member attendance register.'
			},
			{
				title: 'LEDET Joint Ecological Carrying Capacity & Quota Survey 2025/2026',
				category: 'ecological',
				r2Key: 'docs/ledet_quota_survey_2025.pdf',
				fileName: 'LEDET_ACNR_Quota_Survey_2025.pdf',
				fileSize: 3100000,
				contentType: 'application/pdf',
				notes: 'Provincial state wildlife assessment, vegetation indices, and sustainable hunting off-take limits.'
			},
			{
				title: 'Atherstone Annual Audited Financial Statements (FY 2024/2025)',
				category: 'financial',
				r2Key: 'docs/acnr_financial_statements_2025.pdf',
				fileName: 'ACNR_Financial_Statements_2025.pdf',
				fileSize: 1650000,
				contentType: 'application/pdf',
				notes: 'Independent audit report, balance sheet, and reserve operational expenditure breakdown.'
			},
			{
				title: 'Perimeter Fence Security & Electrification Standard Operating Procedure',
				category: 'general',
				r2Key: 'docs/acnr_perimeter_sop_2025.pdf',
				fileName: 'ACNR_Perimeter_SOP_2025.pdf',
				fileSize: 920000,
				contentType: 'application/pdf',
				notes: 'Protocol for boundary fence monitoring, energizer solar maintenance, and emergency break responses.'
			}
		];

		for (const doc of baselineDocs) {
			await db.insert(schema.documents).values({
				id: crypto.randomUUID(),
				title: doc.title,
				category: doc.category,
				r2Key: doc.r2Key,
				fileName: doc.fileName,
				fileSize: doc.fileSize,
				contentType: doc.contentType,
				uploaderId: currentUser.id,
				notes: doc.notes
			});
		}

		rawDocs = await db.query.documents.findMany({
			orderBy: (d, { desc }) => [desc(d.createdAt)],
			with: {
				uploader: true
			}
		});
	}

	return {
		user: currentUser,
		documents: rawDocs,
		canUpload,
		isSecretary
	};
};

export const actions: Actions = {
	uploadDocument: async ({ request, locals, platform }) => {
		if (!locals.user) {
			return fail(401, { error: 'Authentication required' });
		}

		if (!hasAnyRole(locals.user.roles, ['main_plo', 'executive', 'secretary'])) {
			return fail(403, { error: 'Unauthorized: Landowner rights required to upload documents.' });
		}

		if (!platform?.env?.DB) {
			return fail(500, { error: 'Database service unavailable' });
		}

		const formData = await request.formData();
		const title = formData.get('title')?.toString().trim();
		const category = formData.get('category')?.toString().trim() || 'general';
		const notes = formData.get('notes')?.toString().trim() || null;
		const file = formData.get('file') as File | null;

		if (!title) {
			return fail(400, { error: 'Document title is required.' });
		}

		const validCategories = ['constitution', 'agm_minutes', 'ecological', 'financial', 'general'];
		if (!validCategories.includes(category)) {
			return fail(400, { error: 'Invalid document category selected.' });
		}

		const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB
		const ALLOWED_EXTENSIONS = new Set(['pdf', 'png', 'jpg', 'jpeg', 'webp', 'txt', 'csv', 'docx', 'xlsx']);
		const ALLOWED_MIME_TYPES = new Set([
			'application/pdf',
			'image/png',
			'image/jpeg',
			'image/webp',
			'text/plain',
			'text/csv',
			'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
			'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
		]);

		let fileName = 'Uploaded_Document.pdf';
		let fileSize = 1500000;
		let contentType = 'application/pdf';
		const docId = crypto.randomUUID();
		const sanitizedBaseName = file?.name ? file.name.replace(/[^a-zA-Z0-9._-]/g, '_') : 'document.pdf';
		const r2Key = `docs/${docId}_${sanitizedBaseName}`;

		if (file && file.size > 0) {
			if (file.size > MAX_FILE_SIZE) {
				return fail(400, { error: 'File exceeds the 20 MB maximum upload limit.' });
			}

			const ext = file.name.split('.').pop()?.toLowerCase() || '';
			const resolvedType = file.type || 'application/octet-stream';
			if (!ALLOWED_EXTENSIONS.has(ext) || !ALLOWED_MIME_TYPES.has(resolvedType)) {
				return fail(400, {
					error: 'Unsupported file type. Allowed formats: PDF, PNG, JPG, WEBP, TXT, CSV, DOCX, XLSX.'
				});
			}

			fileName = sanitizedBaseName;
			fileSize = file.size;
			contentType = resolvedType;

			// Store in Cloudflare R2 if binding is active
			if (platform.env.BUCKET) {
				try {
					const buffer = await file.arrayBuffer();
					await platform.env.BUCKET.put(r2Key, buffer, {
						httpMetadata: { contentType }
					});
				} catch (err) {
					console.error('Failed to store document in R2:', err);
					return fail(500, { error: 'Failed to store document in object storage. Please try again.' });
				}
			}
		}

		const db = getDb(platform.env.DB);
		await db.insert(schema.documents).values({
			id: docId,
			title,
			category,
			r2Key,
			fileName,
			fileSize,
			contentType,
			uploaderId: locals.user.id,
			notes
		});

		await logAuditEvent(platform.env.DB, {
			userId: locals.user.id,
			userEmail: locals.user.email,
			roleAtTime: locals.user.roles.join(', '),
			actionType: 'DOCUMENT_UPLOADED',
			recordId: docId,
			recordType: 'documents',
			details: { title, category, fileName, fileSize }
		});

		return {
			success: true,
			message: `Document "${title}" safely uploaded to the Vault.`
		};
	},

	deleteDocument: async ({ request, locals, platform }) => {
		if (!locals.user) {
			return fail(401, { error: 'Authentication required' });
		}

		if (!platform?.env?.DB) {
			return fail(500, { error: 'Database service unavailable' });
		}

		const formData = await request.formData();
		const documentId = formData.get('documentId')?.toString();

		if (!documentId) {
			return fail(400, { error: 'Document ID required' });
		}

		const db = getDb(platform.env.DB);
		const doc = await db.query.documents.findFirst({
			where: eq(schema.documents.id, documentId)
		});

		if (!doc) {
			return fail(404, { error: 'Document not found' });
		}

		const isUploader = doc.uploaderId === locals.user.id;
		const isSecretary = locals.user.roles.includes('secretary');

		if (!isUploader && !isSecretary) {
			return fail(403, { error: 'Permission denied: Only the uploader or Secretary can remove files.' });
		}

		// Delete from R2 if present
		if (platform.env.BUCKET && doc.r2Key) {
			try {
				await platform.env.BUCKET.delete(doc.r2Key);
			} catch (e) {
				console.warn('R2 delete failed or key missing:', e);
			}
		}

		await db.delete(schema.documents).where(eq(schema.documents.id, documentId));

		await logAuditEvent(platform.env.DB, {
			userId: locals.user.id,
			userEmail: locals.user.email,
			roleAtTime: locals.user.roles.join(', '),
			actionType: 'DOCUMENT_DELETED',
			recordId: documentId,
			recordType: 'documents',
			details: { title: doc.title, category: doc.category }
		});

		return {
			success: true,
			message: `Document "${doc.title}" removed from the Vault.`
		};
	}
};
