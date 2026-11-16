<script lang="ts">
	import type { PageData } from './$types';
	import {
		Bot,
		Send,
		User,
		Scale,
		BookOpen,
		ChevronLeft,
		ExternalLink,
		Sparkles,
		ShieldCheck,
		Info,
		X,
		Layers
	} from 'lucide-svelte';

	let { data }: { data: PageData } = $props();

	interface Message {
		role: 'user' | 'assistant';
		content: string;
		citations?: { label: string; articleNumber: string; clauseNumber?: string }[];
		timestamp: Date;
	}

	let messages = $state<Message[]>([
		{
			role: 'assistant',
			content:
				'Dumelang / Good day, Landowner. I am the **Atherstone Constitutional AI Assistant**.\n\nI am strictly bounded to the official codified **Atherstone Collaborative Nature Reserve (ACNR) Constitution**. You can ask me any inquiry regarding share-weighted voting (10,000 basis points), 75% special resolutions, quota allocations, Associate Member visibility, or reserve access protocols.',
			citations: [
				{ label: 'Article 1.2', articleNumber: '1', clauseNumber: '1.2' },
				{ label: 'Article 3.1', articleNumber: '3', clauseNumber: '3.1' }
			],
			timestamp: new Date()
		}
	]);

	let inputQuery = $state<string>('');
	let isLoading = $state<boolean>(false);
	let selectedClause = $state<{
		articleNumber: string;
		articleTitle: string;
		clauseNumber?: string;
		heading?: string;
		text?: string;
	} | null>(null);

	let showFullConstitution = $state<boolean>(false);

	const promptSuggestions = [
		'What voting threshold is needed to amend the constitution?',
		'How are hunting quotas allocated to private landowners?',
		'Can Associate Members vote on reserve resolutions?',
		'What is the minimum quorum for an AGM or digital ballot?',
		'Can I sell or trade my surplus hunting quota to another member?'
	];

	async function submitQuery(questionText?: string) {
		const q = (questionText || inputQuery).trim();
		if (!q || isLoading) return;

		inputQuery = '';
		messages.push({
			role: 'user',
			content: q,
			timestamp: new Date()
		});

		isLoading = true;

		try {
			const res = await fetch('/api/constitution/ask', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ question: q })
			});

			const json = (await res.json()) as {
				success?: boolean;
				answer?: string;
				citations?: { label: string; articleNumber: string; clauseNumber?: string }[];
				error?: string;
			};
			if (json.success && json.answer) {
				messages.push({
					role: 'assistant',
					content: json.answer,
					citations: json.citations,
					timestamp: new Date()
				});
			} else {
				messages.push({
					role: 'assistant',
					content: `I could not retrieve an authoritative clause: ${json.error || 'Please retry your query.'}`,
					timestamp: new Date()
				});
			}
		} catch (err) {
			messages.push({
				role: 'assistant',
				content: 'A network communication error occurred. Please verify your connection and try again.',
				timestamp: new Date()
			});
		} finally {
			isLoading = false;
		}
	}

	function inspectCitation(citation: { articleNumber: string; clauseNumber?: string }) {
		const article = data.articles.find((a) => a.articleNumber === citation.articleNumber);
		if (!article) return;

		let clause = article.clauses[0];
		if (citation.clauseNumber) {
			const found = article.clauses.find((c) => c.clauseNumber === citation.clauseNumber);
			if (found) clause = found;
		}

		selectedClause = {
			articleNumber: article.articleNumber,
			articleTitle: article.title,
			clauseNumber: clause?.clauseNumber,
			heading: clause?.heading,
			text: clause?.text || article.summary
		};
	}
</script>

<svelte:head>
	<title>Constitution AI Assistant | Atherstone PLO</title>
</svelte:head>

<div class="space-y-6 max-w-5xl mx-auto">
	<!-- Navigation back to documents -->
	<div class="flex items-center justify-between">
		<a
			href="/documents"
			class="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--color-primary)] hover:underline"
		>
			<ChevronLeft class="w-4 h-4" />
			Back to Document Vault
		</a>

		<button
			type="button"
			onclick={() => (showFullConstitution = !showFullConstitution)}
			class="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
		>
			<Layers class="w-3.5 h-3.5" />
			<span>{showFullConstitution ? 'Hide Constitution Text' : 'Browse Full Constitution (6 Articles)'}</span>
		</button>
	</div>

	<!-- Page Header -->
	<div class="border-b border-[var(--color-border)] pb-4">
		<div class="flex items-center gap-3">
			<span class="p-2.5 rounded-xl bg-[var(--color-primary)] text-white shadow-xs">
				<Bot class="w-6 h-6" />
			</span>
			<div>
				<div class="flex items-center gap-2">
					<h1 class="text-2xl font-bold tracking-tight text-[var(--color-text-primary)]">
						Atherstone Constitutional AI Assistant
					</h1>
					<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300">
						<ShieldCheck class="w-3 h-3" />
						Strictly Grounded
					</span>
				</div>
				<p class="text-xs text-[var(--color-text-secondary)] mt-0.5">
					Real-time natural-language querying of reserve bylaws, 75% resolution thresholds, and wildlife quotas with verified clause citations.
				</p>
			</div>
		</div>
	</div>

	<!-- Full Constitution Browser Drawer (Collapsible) -->
	{#if showFullConstitution}
		<div class="p-5 rounded-2xl border border-[var(--color-primary)]/40 bg-[var(--color-bg-surface)] shadow-md space-y-4">
			<div class="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
				<div class="flex items-center gap-2 font-bold text-sm text-[var(--color-text-primary)]">
					<Scale class="w-4 h-4 text-[var(--color-primary)]" />
					<span>Codified Constitution of Atherstone Nature Reserve</span>
				</div>
				<button
					type="button"
					onclick={() => (showFullConstitution = false)}
					class="p-1 rounded text-stone-400 hover:text-stone-600"
				>
					<X class="w-4 h-4" />
				</button>
			</div>

			<div class="space-y-4 max-h-96 overflow-y-auto pr-2">
				{#each data.articles as art}
					<div class="p-4 rounded-xl bg-stone-50 dark:bg-stone-900/40 border border-[var(--color-border)] space-y-2 text-xs">
						<div class="font-bold text-sm text-[var(--color-text-primary)] flex items-center gap-2">
							<span class="px-2 py-0.5 rounded bg-[var(--color-primary)]/10 text-[var(--color-primary)] font-black">
								Article {art.articleNumber}
							</span>
							<span>{art.title}</span>
						</div>
						<p class="text-[var(--color-text-secondary)] italic leading-relaxed">
							{art.summary}
						</p>

						<div class="pt-2 border-t border-[var(--color-border)]/50 space-y-2">
							{#each art.clauses as cl}
								<div>
									<strong class="text-[var(--color-text-primary)] font-semibold">
										[{cl.clauseNumber}] {cl.heading}:
									</strong>
									<span class="text-[var(--color-text-secondary)] leading-relaxed ml-1">
										{cl.text}
									</span>
								</div>
							{/each}
						</div>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Suggested Questions Pills -->
	<div class="space-y-1.5">
		<div class="text-[11px] font-bold text-[var(--color-text-secondary)] uppercase tracking-wider flex items-center gap-1.5">
			<Sparkles class="w-3.5 h-3.5 text-amber-500" />
			<span>Suggested Inquiries:</span>
		</div>
		<div class="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
			{#each promptSuggestions as suggestion}
				<button
					type="button"
					disabled={isLoading}
					onclick={() => submitQuery(suggestion)}
					class="px-3 py-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-bg-surface)] hover:bg-stone-100 dark:hover:bg-stone-800 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] shrink-0 transition-colors text-left font-medium"
				>
					{suggestion}
				</button>
			{/each}
		</div>
	</div>

	<!-- Chat Conversation Container -->
	<div class="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-surface)] shadow-xs flex flex-col h-[520px] overflow-hidden">
		<!-- Message List -->
		<div class="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
			{#each messages as msg}
				{#if msg.role === 'user'}
					<!-- User Message -->
					<div class="flex items-start justify-end gap-3">
						<div class="max-w-xl bg-[var(--color-primary)] text-white px-4 py-3 rounded-2xl rounded-tr-xs shadow-xs text-sm font-medium leading-relaxed">
							{msg.content}
						</div>
						<div class="w-8 h-8 rounded-full bg-[var(--color-primary)]/20 text-[var(--color-primary)] flex items-center justify-center shrink-0">
							<User class="w-4 h-4" />
						</div>
					</div>
				{:else}
					<!-- Assistant Message -->
					<div class="flex items-start gap-3">
						<div class="w-8 h-8 rounded-full bg-[var(--color-primary)] text-white flex items-center justify-center shrink-0 shadow-xs">
							<Bot class="w-4 h-4" />
						</div>
						<div class="max-w-2xl bg-stone-50/80 dark:bg-stone-900/60 border border-[var(--color-border)] px-5 py-4 rounded-2xl rounded-tl-xs shadow-xs text-sm space-y-3">
							<div class="prose dark:prose-invert max-w-none text-xs sm:text-sm text-[var(--color-text-primary)] leading-relaxed whitespace-pre-wrap">
								{msg.content}
							</div>

							<!-- Citations Pills -->
							{#if msg.citations && msg.citations.length > 0}
								<div class="pt-2 border-t border-[var(--color-border)]/60 flex flex-wrap items-center gap-1.5 text-xs">
									<span class="text-[11px] font-bold text-[var(--color-text-secondary)] mr-1 flex items-center gap-1">
										<Scale class="w-3 h-3 text-[var(--color-primary)]" />
										Official Citations:
									</span>
									{#each msg.citations as cit}
										<button
											type="button"
											onclick={() => inspectCitation(cit)}
											class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[var(--color-primary)]/10 hover:bg-[var(--color-primary)]/20 text-[var(--color-primary)] border border-[var(--color-primary)]/30 transition-colors cursor-pointer"
											title="Click to view unabridged constitutional text"
										>
											<span>{cit.label}</span>
											<ExternalLink class="w-3 h-3" />
										</button>
									{/each}
								</div>
							{/if}
						</div>
					</div>
				{/if}
			{/each}

			{#if isLoading}
				<div class="flex items-start gap-3">
					<div class="w-8 h-8 rounded-full bg-[var(--color-primary)] text-white flex items-center justify-center shrink-0 shadow-xs">
						<Bot class="w-4 h-4" />
					</div>
					<div class="bg-stone-50 dark:bg-stone-900/60 border border-[var(--color-border)] px-4 py-3 rounded-2xl rounded-tl-xs text-xs text-[var(--color-text-secondary)] flex items-center gap-2">
						<span class="loading loading-dots loading-xs"></span>
						<span>Reviewing Atherstone Constitution clauses...</span>
					</div>
				</div>
			{/if}
		</div>

		<!-- Input Box -->
		<form
			onsubmit={(e) => {
				e.preventDefault();
				submitQuery();
			}}
			class="p-3 sm:p-4 border-t border-[var(--color-border)] bg-stone-50/50 dark:bg-stone-850/50 flex items-center gap-2"
		>
			<input
				type="text"
				bind:value={inputQuery}
				disabled={isLoading}
				placeholder="Ask a question on voting rights, quotas, land portions, or traverse rules..."
				class="input-field flex-1 px-4 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-surface)] text-sm"
			/>

			<button
				type="submit"
				disabled={isLoading || !inputQuery.trim()}
				class="btn bg-purple-700 hover:bg-purple-800 text-white border-0 p-2.5 rounded-xl disabled:opacity-50 transition-all shrink-0 flex items-center justify-center shadow-xs"
				aria-label="Send message"
			>
				<Send class="w-4 h-4" />
			</button>
		</form>
	</div>

	<!-- ========================================== -->
	<!-- MODAL: VERBATIM CONSTITUTIONAL CLAUSE      -->
	<!-- ========================================== -->
	{#if selectedClause}
		<div
			class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
			role="dialog"
			aria-modal="true"
			aria-labelledby="clause-inspector-title"
		>
			<div class="bg-[var(--color-bg-surface)] w-full max-w-lg rounded-2xl border border-[var(--color-border)] shadow-xl overflow-hidden p-6 space-y-4">
				<div class="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
					<div class="flex items-center gap-2">
						<span class="p-2 rounded-lg bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
							<Scale class="w-5 h-5" />
						</span>
						<div>
							<h3 id="clause-inspector-title" class="text-base font-bold text-[var(--color-text-primary)]">
								Verbatim Constitutional Citation
							</h3>
							<p class="text-xs text-[var(--color-text-secondary)]">
								Official certified legal clause
							</p>
						</div>
					</div>
					<button
						type="button"
						onclick={() => (selectedClause = null)}
						class="p-1.5 rounded-lg text-stone-400 hover:text-stone-600"
					>
						<X class="w-4 h-4" />
					</button>
				</div>

				<div class="space-y-3">
					<div class="flex items-center gap-2">
						<span class="px-2.5 py-0.5 rounded text-xs font-bold bg-[var(--color-primary)] text-white">
							Article {selectedClause.clauseNumber || selectedClause.articleNumber}
						</span>
						<span class="font-bold text-sm text-[var(--color-text-primary)]">
							{selectedClause.heading || selectedClause.articleTitle}
						</span>
					</div>

					<div class="p-4 rounded-xl bg-stone-50 dark:bg-stone-900/60 border border-[var(--color-border)] text-xs sm:text-sm text-[var(--color-text-primary)] leading-relaxed whitespace-pre-wrap font-serif">
						"{selectedClause.text}"
					</div>

					<div class="text-[11px] text-[var(--color-text-secondary)] italic">
						From: {selectedClause.articleTitle} • Atherstone Collaborative Nature Reserve Constitution
					</div>
				</div>

				<div class="pt-3 border-t border-[var(--color-border)] flex justify-end">
					<button
						type="button"
						onclick={() => (selectedClause = null)}
						class="px-4 py-2 rounded-lg border border-[var(--color-border)] text-xs font-semibold hover:bg-stone-100 dark:hover:bg-stone-800"
					>
						Close
					</button>
				</div>
			</div>
		</div>
	{/if}
</div>
