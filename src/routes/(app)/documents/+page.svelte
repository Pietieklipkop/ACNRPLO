<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { enhance } from '$app/forms';
	import {
		FileText,
		Plus,
		Download,
		Search,
		Filter,
		CheckCircle2,
		AlertTriangle,
		X,
		Calendar,
		User,
		Trash2,
		Bot,
		ExternalLink,
		BookOpen,
		ShieldCheck,
		FileSpreadsheet,
		Scale
	} from 'lucide-svelte';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let selectedCategory = $state<string>('all');
	let searchQuery = $state<string>('');
	let uploadModalOpen = $state<boolean>(false);
	let isSubmitting = $state<boolean>(false);

	let formTitle = $state('');
	let formCategory = $state('general');
	let formNotes = $state('');

	const categoryMeta: Record<
		string,
		{ label: string; badgeClass: string; icon: any }
	> = {
		constitution: {
			label: 'Constitution & By-Laws',
			badgeClass: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border-purple-300',
			icon: Scale
		},
		agm_minutes: {
			label: 'AGM Minutes',
			badgeClass: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 border-indigo-300',
			icon: BookOpen
		},
		ecological: {
			label: 'Ecological & Quotas',
			badgeClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300',
			icon: FileText
		},
		financial: {
			label: 'Financial Statements',
			badgeClass: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-300',
			icon: FileSpreadsheet
		},
		general: {
			label: 'Operating Protocols',
			badgeClass: 'bg-stone-100 text-stone-800 dark:bg-stone-800 dark:text-stone-300 border-stone-300',
			icon: FileText
		}
	};

	const filteredDocs = $derived(
		data.documents.filter((doc) => {
			if (selectedCategory !== 'all' && doc.category !== selectedCategory) {
				return false;
			}
			if (searchQuery.trim()) {
				const query = searchQuery.toLowerCase();
				const matchTitle = doc.title.toLowerCase().includes(query);
				const matchNotes = (doc.notes || '').toLowerCase().includes(query);
				const matchFile = doc.fileName.toLowerCase().includes(query);
				if (!matchTitle && !matchNotes && !matchFile) return false;
			}
			return true;
		})
	);

	function formatBytes(bytes: number) {
		if (bytes < 1024) return bytes + ' B';
		if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
		return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
	}

	function formatDate(val: any) {
		if (!val) return '';
		const d = new Date(val);
		return d.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' });
	}
</script>

<svelte:head>
	<title>Document Vault & Records | Atherstone PLO</title>
</svelte:head>

<div class="space-y-6 max-w-7xl mx-auto">
	<!-- Page Header -->
	<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[var(--color-border)] pb-5">
		<div class="flex items-center gap-3">
			<span class="p-2.5 rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
				<BookOpen class="w-7 h-7" />
			</span>
			<div>
				<h1 class="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--color-text-primary)]">
					Document Vault & Archives
				</h1>
				<p class="text-sm text-[var(--color-text-secondary)] mt-0.5">
					Atherstone official records repository: codified constitution, AGM minutes, ecological audits & financial ledgers.
				</p>
			</div>
		</div>

		<!-- Actions -->
		<div class="flex items-center gap-2.5">
			<a
				href="/constitution/ai"
				class="btn bg-[var(--color-bg-base)] text-[var(--color-text-primary)] hover:bg-[var(--color-border)]/40 border border-[var(--color-border)] inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold shadow-xs"
			>
				<Bot class="w-4 h-4 text-[var(--color-primary)]" />
				Ask Constitution AI
			</a>

			{#if data.canUpload}
				<button
					type="button"
					onclick={() => (uploadModalOpen = true)}
					class="btn bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary)]/90 border-0 inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold shadow-xs"
				>
					<Plus class="w-4 h-4" />
					Upload Document
				</button>
			{/if}
		</div>
	</div>

	<!-- Alert Messages -->
	{#if form?.error}
		<div
			class="p-4 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-800 dark:text-rose-200 text-sm flex items-start gap-3 shadow-xs"
			role="alert"
		>
			<AlertTriangle class="w-5 h-5 shrink-0 text-rose-600" />
			<div>
				<strong class="font-semibold">Error:</strong>
				<span>{form.error}</span>
			</div>
		</div>
	{/if}

	{#if form?.message}
		<div
			class="p-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-emerald-800 dark:text-emerald-200 text-sm flex items-start gap-3 shadow-xs"
			role="status"
		>
			<CheckCircle2 class="w-5 h-5 shrink-0 text-emerald-600" />
			<div>
				<strong class="font-semibold">Success:</strong>
				<span>{form.message}</span>
			</div>
		</div>
	{/if}

	<!-- Constitution Spotlight Banner -->
	<div class="p-5 rounded-2xl border border-[var(--color-primary)]/30 bg-gradient-to-r from-[var(--color-primary)]/10 via-[var(--color-primary)]/5 to-transparent flex flex-col md:flex-row md:items-center md:justify-between gap-4 shadow-xs">
		<div class="flex items-center gap-4">
			<div class="p-3 rounded-2xl bg-[var(--color-primary)] text-white shadow-xs shrink-0">
				<Scale class="w-7 h-7" />
			</div>
			<div>
				<div class="flex items-center gap-2">
					<span class="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-[var(--color-primary)] text-white">
						Codified Master
					</span>
					<span class="text-xs text-[var(--color-text-secondary)] font-semibold">2024 Revision</span>
				</div>
				<h2 class="text-lg sm:text-xl font-bold text-[var(--color-text-primary)] mt-0.5">
					Atherstone PLO Constitution & Legal Framework
				</h2>
				<p class="text-xs text-[var(--color-text-secondary)] mt-0.5 max-w-2xl">
					Binding governance articles on share-weighted voting (10,000 bps), 75% special resolutions, land portions, and carrying capacity off-take.
				</p>
			</div>
		</div>

		<div class="flex items-center gap-2.5 shrink-0">
			<a
				href="/constitution/ai"
				class="btn bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary)]/90 border-0 inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold"
			>
				<Bot class="w-4 h-4" />
				Ask AI Assistant
			</a>
			<a
				href="/api/documents/acnr_constitution/download"
				target="_blank"
				class="btn bg-[var(--color-bg-base)] text-[var(--color-text-primary)] hover:bg-[var(--color-border)]/40 border border-[var(--color-border)] inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold"
			>
				<Download class="w-3.5 h-3.5" />
				View PDF
			</a>
		</div>
	</div>

	<!-- Filter & Search Bar -->
	<div class="bg-[var(--color-bg-surface)] p-4 rounded-xl border border-[var(--color-border)] shadow-xs space-y-3">
		<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
			<!-- Search input -->
			<div class="relative w-full sm:max-w-md">
				<Search class="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
				<input
					type="text"
					bind:value={searchQuery}
					placeholder="Search documents by title, file name or notes..."
					class="input-field w-full pl-9 pr-3.5 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-surface)] text-xs"
				/>
			</div>

			<span class="text-xs text-[var(--color-text-secondary)] font-medium self-end sm:self-center tabular-nums">
				Showing {filteredDocs.length} of {data.documents.length} Records
			</span>
		</div>

		<!-- Category Filter Pills -->
		<div class="pt-2 border-t border-[var(--color-border)] flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
			<button
				type="button"
				onclick={() => (selectedCategory = 'all')}
				class="px-2.5 py-1 rounded-full font-semibold shrink-0 transition-colors {selectedCategory ===
				'all'
					? 'bg-[var(--color-primary)] text-white'
					: 'bg-stone-100 dark:bg-stone-800 text-[var(--color-text-secondary)] hover:bg-stone-200 dark:hover:bg-stone-700'}"
			>
				All Categories ({data.documents.length})
			</button>
			{#each Object.entries(categoryMeta) as [key, meta]}
				{@const count = data.documents.filter((d) => d.category === key).length}
				<button
					type="button"
					onclick={() => (selectedCategory = key)}
					class="px-2.5 py-1 rounded-full font-medium shrink-0 flex items-center gap-1.5 transition-colors {selectedCategory ===
					key
						? 'bg-[var(--color-primary)] text-white font-bold'
						: 'bg-stone-100 dark:bg-stone-800 text-[var(--color-text-secondary)] hover:bg-stone-200 dark:hover:bg-stone-700'}"
				>
					<meta.icon class="w-3 h-3" />
					{meta.label} ({count})
				</button>
			{/each}
		</div>
	</div>

	<!-- Documents Grid -->
	{#if filteredDocs.length === 0}
		<div class="text-center py-16 px-4 bg-[var(--color-bg-surface)] rounded-2xl border border-[var(--color-border)]">
			<FileText class="w-12 h-12 mx-auto text-stone-300 dark:text-stone-600 mb-3" />
			<h3 class="text-base font-bold text-[var(--color-text-primary)]">No documents match your query</h3>
			<p class="text-sm text-[var(--color-text-secondary)] max-w-md mx-auto mt-1 mb-4">
				Try clearing your search terms or selecting "All Categories" to view all records.
			</p>
		</div>
	{:else}
		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
			{#each filteredDocs as doc (doc.id)}
				{@const meta = categoryMeta[doc.category] || categoryMeta.general}
				{@const isUploader = doc.uploaderId === data.user.id}
				{@const canDelete = isUploader || data.isSecretary}

				<div class="p-5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-surface)] shadow-xs hover:border-[var(--color-border-focus)] transition-all flex flex-col justify-between space-y-4">
					<div class="space-y-3">
						<!-- Category & Size Header -->
						<div class="flex items-center justify-between">
							<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase border {meta.badgeClass}">
								<meta.icon class="w-3 h-3" />
								{meta.label}
							</span>

							<span class="text-[11px] font-semibold text-[var(--color-text-secondary)] tabular-nums">
								{formatBytes(doc.fileSize)}
							</span>
						</div>

						<!-- Title -->
						<h3 class="text-base font-bold text-[var(--color-text-primary)] leading-snug">
							{doc.title}
						</h3>

						<!-- Notes -->
						{#if doc.notes}
							<p class="text-xs text-[var(--color-text-secondary)] line-clamp-2 leading-relaxed">
								{doc.notes}
							</p>
						{/if}

						<!-- Meta (Uploaded by & date) -->
						<div class="pt-2 border-t border-[var(--color-border)]/60 text-[11px] text-[var(--color-text-secondary)] space-y-1">
							<div class="flex items-center gap-1.5">
								<User class="w-3 h-3 text-stone-400" />
								<span class="truncate">{doc.uploader?.name || 'Atherstone Member'}</span>
							</div>
							<div class="flex items-center gap-1.5 tabular-nums">
								<Calendar class="w-3 h-3 text-stone-400" />
								<span>Uploaded {formatDate(doc.createdAt)}</span>
							</div>
						</div>
					</div>

					<!-- Card Actions -->
					<div class="pt-3 border-t border-[var(--color-border)] flex items-center justify-between gap-2">
						<a
							href={`/api/documents/${doc.id}/download`}
							target="_blank"
							class="btn btn-sm bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary)]/90 border-0 flex-1 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center justify-center gap-1.5"
						>
							<Download class="w-3.5 h-3.5" />
							<span>Download / View</span>
						</a>

						{#if canDelete}
							<form method="POST" action="?/deleteDocument" use:enhance>
								<input type="hidden" name="documentId" value={doc.id} />
								<button
									type="submit"
									onclick={(e) => {
										if (!confirm('Are you sure you want to permanently delete this document?')) {
											e.preventDefault();
										}
									}}
									class="p-1.5 text-stone-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
									title="Delete document"
								>
									<Trash2 class="w-4 h-4" />
								</button>
							</form>
						{/if}
					</div>
				</div>
			{/each}
		</div>
	{/if}

	<!-- ========================================== -->
	<!-- MODAL: UPLOAD DOCUMENT                     -->
	<!-- ========================================== -->
	{#if uploadModalOpen}
		<div
			class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto"
			role="dialog"
			aria-modal="true"
			aria-labelledby="upload-modal-title"
		>
			<div class="bg-[var(--color-bg-surface)] w-full max-w-lg rounded-2xl border border-[var(--color-border)] shadow-xl overflow-hidden my-8">
				<div class="p-5 border-b border-[var(--color-border)] flex items-center justify-between bg-stone-50 dark:bg-stone-850">
					<div class="flex items-center gap-2.5">
						<span class="p-2 rounded-lg bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
							<FileText class="w-5 h-5" />
						</span>
						<div>
							<h3 id="upload-modal-title" class="text-lg font-bold text-[var(--color-text-primary)]">
								Upload Official Document
							</h3>
							<p class="text-xs text-[var(--color-text-secondary)]">
								Store reports, minutes, or legal records in the decentralized vault.
							</p>
						</div>
					</div>
					<button
						type="button"
						onclick={() => (uploadModalOpen = false)}
						class="p-2 rounded-lg text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
					>
						<X class="w-5 h-5" />
					</button>
				</div>

				<form
					method="POST"
					action="?/uploadDocument"
					enctype="multipart/form-data"
					use:enhance={() => {
						isSubmitting = true;
						return async ({ update }) => {
							await update();
							isSubmitting = false;
							uploadModalOpen = false;
						};
					}}
					class="p-6 space-y-4"
				>
					<div>
						<label for="title" class="block text-xs font-bold text-[var(--color-text-primary)] uppercase tracking-wider mb-1.5">
							Document Title:
						</label>
						<input
							type="text"
							id="title"
							name="title"
							bind:value={formTitle}
							required
							placeholder="e.g. AGM Executive Committee Report 2026"
							class="input-field w-full px-3.5 py-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-surface)] text-sm font-semibold"
						/>
					</div>

					<div>
						<label for="category" class="block text-xs font-bold text-[var(--color-text-primary)] uppercase tracking-wider mb-1.5">
							Repository Category:
						</label>
						<select
							id="category"
							name="category"
							bind:value={formCategory}
							class="input-field w-full px-3.5 py-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-surface)] text-sm"
						>
							<option value="constitution">Constitution &amp; By-Laws</option>
							<option value="agm_minutes">AGM Minutes &amp; Resolutions</option>
							<option value="ecological">Ecological &amp; Quota Reports</option>
							<option value="financial">Financial Statements &amp; Audits</option>
							<option value="general">Operating Protocols &amp; Security</option>
						</select>
					</div>

					<div>
						<label for="file" class="block text-xs font-bold text-[var(--color-text-primary)] uppercase tracking-wider mb-1.5">
							Select File (PDF, DOCX, XLSX, etc.):
						</label>
						<input
							type="file"
							id="file"
							name="file"
							accept=".pdf,.docx,.doc,.xlsx,.xls,.png,.jpg"
							class="w-full text-xs text-stone-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[var(--color-primary)]/10 file:text-[var(--color-primary)] hover:file:bg-[var(--color-primary)]/20 cursor-pointer"
						/>
					</div>

					<div>
						<label for="notes" class="block text-xs font-bold text-[var(--color-text-primary)] uppercase tracking-wider mb-1.5">
							Context & Summary Notes (Optional):
						</label>
						<textarea
							id="notes"
							name="notes"
							rows="3"
							bind:value={formNotes}
							placeholder="Brief description of the document contents and key takeaways..."
							class="input-field w-full px-3.5 py-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-surface)] text-sm"
						></textarea>
					</div>

					<div class="pt-3 border-t border-[var(--color-border)] flex items-center justify-end gap-3">
						<button
							type="button"
							onclick={() => (uploadModalOpen = false)}
							class="px-4 py-2 rounded-lg border border-[var(--color-border)] text-sm font-semibold hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
						>
							Cancel
						</button>
						<button
							type="submit"
							disabled={isSubmitting}
							class="btn bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary)]/90 border-0 px-5 py-2 rounded-lg text-sm font-semibold inline-flex items-center gap-2"
						>
							{#if isSubmitting}
								<span class="loading loading-spinner loading-xs"></span>
								Uploading...
							{:else}
								<CheckCircle2 class="w-4 h-4" />
								Upload to Vault
							{/if}
						</button>
					</div>
				</form>
			</div>
		</div>
	{/if}
</div>
