<script lang="ts">
	import {
		Vote,
		Plus,
		Clock,
		CheckCircle2,
		AlertCircle,
		X,
		ShieldCheck,
		Filter
	} from 'lucide-svelte';
	import { enhance } from '$app/forms';

	let { data, form } = $props();

	let filterStatus = $state<'all' | 'open' | 'closed'>('all');
	let showNewPollModal = $state(false);

	// Form values for Decision creation
	let pollTitle = $state('');
	let pollDescription = $state('');
	let pollResolutionType = $state('simple');
	let pollClosesAt = $state('');
	let isSubmitting = $state(false);

	const filteredPolls = $derived(
		(data.polls || []).filter((p: any) => {
			if (filterStatus === 'all') return true;
			if (filterStatus === 'open') return p.status === 'open' || p.status === 'active';
			return p.status === filterStatus;
		})
	);

	function calculateTally(poll: any) {
		let agree = 0;
		let disagree = 0;
		let abstain = 0;
		for (const v of poll.votes || []) {
			if (v.choice === 'agree') agree += v.weightBps;
			if (v.choice === 'disagree') disagree += v.weightBps;
			if (v.choice === 'abstain') abstain += v.weightBps;
		}
		const total = agree + disagree + abstain;
		return { agree, disagree, abstain, total };
	}
</script>

<svelte:head>
	<title>Decisions Lifecycle Management — ACNRPLO</title>
</svelte:head>

<div class="space-y-6">
	<!-- Section Title & Actions Header -->
	<div class="bg-[var(--color-bg-surface)] border border-[var(--color-border)] rounded-2xl p-4 sm:p-6 shadow-sm">
		<div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
			<div>
				<div class="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-purple-700 dark:text-purple-400">
					<Vote class="w-4 h-4" />
					Democratic Sovereignty & Resolutions
				</div>
				<h1 class="text-2xl sm:text-3xl font-extrabold tracking-tight mt-1">
					Decisions Lifecycle Management
				</h1>
				<p class="text-xs sm:text-sm text-[var(--color-text-secondary)] mt-1 max-w-2xl">
					Draft formal reserve decisions, manage live voting windows, evaluate share-weighted quorums, and ratify binding reserve resolutions.
				</p>
			</div>

			<!-- Quick Action Button -->
			<div>
				<button
					type="button"
					onclick={() => (showNewPollModal = true)}
					class="btn bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary)]/90 border-0 flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold shadow-xs"
				>
					<Plus class="w-4 h-4" />
					Create Decision
				</button>
			</div>
		</div>

		<!-- Status Metrics & Filter Tabs -->
		<div class="flex flex-wrap items-center justify-between gap-3 mt-6 pt-6 border-t border-[var(--color-border)]">
			<div class="flex items-center gap-1.5 overflow-x-auto">
				<button
					type="button"
					onclick={() => (filterStatus = 'all')}
					class="px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all {filterStatus === 'all'
						? 'bg-[var(--color-primary)] text-white shadow-xs'
						: 'text-[var(--color-text-secondary)] hover:bg-[var(--color-border)]/30'}"
				>
					All Decisions ({data.polls.length})
				</button>
				<button
					type="button"
					onclick={() => (filterStatus = 'open')}
					class="px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all {filterStatus === 'open'
						? 'bg-emerald-700 text-white shadow-xs'
						: 'text-[var(--color-text-secondary)] hover:bg-[var(--color-border)]/30'}"
				>
					Active Voting ({data.polls.filter((p: any) => p.status === 'open' || p.status === 'active').length})
				</button>
				<button
					type="button"
					onclick={() => (filterStatus = 'closed')}
					class="px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all {filterStatus === 'closed'
						? 'bg-stone-800 text-white shadow-xs'
						: 'text-[var(--color-text-secondary)] hover:bg-[var(--color-border)]/30'}"
				>
					Closed / Ratified ({data.polls.filter((p: any) => p.status === 'closed').length})
				</button>
			</div>

			<div class="text-xs text-[var(--color-text-secondary)] font-mono font-bold">
				Reserve Quorum: 10,000 bps (100.00%)
			</div>
		</div>
	</div>

	<!-- Form Status Alerts -->
	{#if form?.error}
		<div class="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200 flex items-center gap-3 text-xs">
			<AlertCircle class="w-5 h-5 shrink-0" />
			<span>{form.error}</span>
		</div>
	{/if}
	{#if form?.success}
		<div class="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-200 flex items-center gap-3 text-xs">
			<CheckCircle2 class="w-5 h-5 shrink-0" />
			<span>Decision action successfully committed and audited.</span>
		</div>
	{/if}

	<!-- Decisions List -->
	<div class="space-y-4">
		{#if filteredPolls.length === 0}
			<div class="p-8 text-center bg-[var(--color-bg-surface)] rounded-2xl border border-[var(--color-border)]">
				<Vote class="w-10 h-10 text-[var(--color-text-secondary)] mx-auto mb-2 opacity-50" />
				<h3 class="font-bold text-sm">No decisions match your filter</h3>
				<p class="text-xs text-[var(--color-text-secondary)] mt-1">Create a new decision or choose a different status filter.</p>
			</div>
		{:else}
			{#each filteredPolls as p}
				{@const tally = calculateTally(p)}
				{@const totalBps = tally.total}
				{@const quorumPct = ((totalBps / 10000) * 100).toFixed(1)}
				{@const isSpecial = p.resolutionType === 'special'}
				{@const threshold = isSpecial ? 75 : 50}
				{@const isOpen = p.status === 'open' || p.status === 'active'}

				<div class="bg-[var(--color-bg-surface)] border border-[var(--color-border)] rounded-2xl p-6 shadow-sm space-y-4">
					<div class="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
						<div class="space-y-1">
							<div class="flex items-center gap-2">
								<span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider {isOpen ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 animate-pulse' : 'bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300'}">
									{isOpen ? 'Open' : p.status}
								</span>
								<span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider {isSpecial ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300' : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'}">
									{isSpecial ? 'Special Resolution (≥75%)' : 'Simple Majority (>50%)'}
								</span>
								{#if p.status === 'closed'}
									{@const decisive = tally.agree + tally.disagree}
									{@const agreePct = decisive > 0 ? (tally.agree / decisive) * 100 : 0}
									{@const quorumMet = (totalBps / 10000) * 100 >= 50}
									{@const passed = quorumMet && (isSpecial ? agreePct >= 75 : agreePct > 50)}
									<span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider {passed ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'}">
										{passed ? '✓ Passed' : '✗ Failed'}
									</span>
								{/if}
							</div>
							<h3 class="text-base sm:text-lg font-extrabold">{p.title}</h3>
							<p class="text-xs text-[var(--color-text-secondary)] max-w-3xl leading-relaxed">
								{p.description}
							</p>
						</div>

						<div class="flex flex-col sm:items-end gap-2 shrink-0">
							{#if p.closesAt}
								<div class="flex items-center gap-1.5 text-xs text-[var(--color-text-secondary)] font-mono">
									<Clock class="w-3.5 h-3.5" />
									<span>Closes: {new Date(p.closesAt).toISOString().split('T')[0]}</span>
								</div>
							{/if}

							{#if isOpen}
								<form method="POST" action="?/closeDecision" use:enhance>
									<input type="hidden" name="pollId" value={p.id} />
									<button
										type="submit"
										class="btn btn-xs bg-rose-600 hover:bg-rose-700 text-white border-0 font-bold px-3 py-1 rounded-lg shadow-2xs"
										onclick={(e) => {
											if (!confirm(`Are you sure you want to close voting for "${p.title}" and ratify the result?`)) {
												e.preventDefault();
											}
										}}
									>
										Close Decision & Ratify
									</button>
								</form>
							{/if}
						</div>
					</div>

					<!-- Voting Participation & Breakdown Bar -->
					<div class="space-y-2 pt-2 border-t border-[var(--color-border)]">
						<div class="flex items-center justify-between text-xs">
							<span class="font-bold text-[var(--color-text-secondary)]">
								Participation Quorum: <strong class="text-[var(--color-text-primary)] font-mono">{totalBps} / 10,000 bps ({quorumPct}%)</strong>
							</span>
							<div class="flex items-center gap-3 font-mono text-[11px] font-bold">
								<span class="text-emerald-600">Agree: {tally.agree} bps</span>
								<span class="text-rose-600">Disagree: {tally.disagree} bps</span>
								<span class="text-stone-500">Abstain: {tally.abstain} bps</span>
							</div>
						</div>

						<!-- Multi-color Segmented Progress Bar -->
						<div class="w-full bg-[var(--color-border)]/50 h-3 rounded-full overflow-hidden flex">
							{#if totalBps > 0}
								<div class="bg-emerald-500 h-full transition-all" style="width: {(tally.agree / 10000) * 100}%"></div>
								<div class="bg-rose-500 h-full transition-all" style="width: {(tally.disagree / 10000) * 100}%"></div>
								<div class="bg-stone-400 h-full transition-all" style="width: {(tally.abstain / 10000) * 100}%"></div>
							{/if}
						</div>
					</div>

					<!-- Audited Voter Roll (Progressive Disclosure) -->
					{#if p.votes && p.votes.length > 0}
						<details class="group pt-2">
							<summary class="text-xs font-bold text-[var(--color-primary)] cursor-pointer hover:underline list-none flex items-center gap-1">
								<span>View Audited Ballots ({p.votes.length} Landowners Voted)</span>
							</summary>
							<div class="mt-3 overflow-x-auto">
								<table class="w-full text-left text-xs bg-[var(--color-bg-base)]/60 rounded-xl">
									<thead>
										<tr class="border-b border-[var(--color-border)] text-[var(--color-text-secondary)] font-bold text-[10px] uppercase">
											<th class="py-2 px-3">Landowner</th>
											<th class="py-2 px-3">Vote Choice</th>
											<th class="py-2 px-3">Weight (BPS)</th>
											<th class="py-2 px-3">Timestamp</th>
										</tr>
									</thead>
									<tbody class="divide-y divide-[var(--color-border)]">
										{#each p.votes as v}
											<tr>
												<td class="py-2 px-3 font-semibold">{v.voter?.name || 'Unknown'}</td>
												<td class="py-2 px-3">
													<span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase {v.choice === 'agree' ? 'bg-emerald-100 text-emerald-800' : v.choice === 'disagree' ? 'bg-rose-100 text-rose-800' : 'bg-stone-200 text-stone-700'}">
														{v.choice}
													</span>
												</td>
												<td class="py-2 px-3 font-mono font-bold">{v.weightBps} bps</td>
												<td class="py-2 px-3 font-mono text-[11px] text-[var(--color-text-secondary)]">
													{new Date(v.votedAt).toISOString().replace('T', ' ').slice(0, 16)}
												</td>
											</tr>
										{/each}
									</tbody>
								</table>
							</div>
						</details>
					{/if}
				</div>
			{/each}
		{/if}
	</div>
</div>

<!-- Draft Decision Modal -->
{#if showNewPollModal}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn"
		role="dialog"
		aria-modal="true"
		aria-labelledby="modal-create-decision-title"
	>
		<div class="bg-[var(--color-bg-surface)] border border-[var(--color-border)] rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
			<div class="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
				<h3 id="modal-create-decision-title" class="font-extrabold text-base">Create Reserve Decision</h3>
				<button
					type="button"
					onclick={() => (showNewPollModal = false)}
					class="p-1 rounded-lg hover:bg-[var(--color-border)]/40"
					aria-label="Close modal"
				>
					<X class="w-4 h-4" />
				</button>
			</div>
			<form
				method="POST"
				action="?/createDecision"
				use:enhance={() => {
					isSubmitting = true;
					return async ({ result, update }) => {
						isSubmitting = false;
						if (result.type === 'success') {
							showNewPollModal = false;
							pollTitle = '';
							pollDescription = '';
							pollClosesAt = '';
						}
						await update();
					};
				}}
				class="space-y-4"
			>
				<div class="space-y-1">
					<label for="decision-title-input" class="text-xs font-bold text-[var(--color-text-secondary)] block">Decision Title</label>
					<input
						id="decision-title-input"
						type="text"
						name="title"
						required
						placeholder="e.g. Allocation for Perimeter Sensor Telemetry"
						bind:value={pollTitle}
						class="input input-bordered input-sm w-full text-xs font-bold"
					/>
				</div>
				<div class="space-y-1">
					<label for="decision-desc-input" class="text-xs font-bold text-[var(--color-text-secondary)] block">Description / Rationale</label>
					<textarea
						id="decision-desc-input"
						name="description"
						required
						rows="3"
						placeholder="Explain the constitutional, operational, or financial rationale..."
						bind:value={pollDescription}
						class="textarea textarea-bordered textarea-sm w-full text-xs"
					></textarea>
				</div>
				<div class="grid grid-cols-2 gap-3">
					<div class="space-y-1">
						<label for="decision-resolution-type" class="text-xs font-bold text-[var(--color-text-secondary)] block">Resolution Threshold</label>
						<select id="decision-resolution-type" name="resolutionType" bind:value={pollResolutionType} class="select select-bordered select-sm w-full text-xs">
							<option value="simple">Simple Majority (&gt;50%)</option>
							<option value="special">Special Resolution (≥75%)</option>
						</select>
					</div>
					<div class="space-y-1">
						<label for="decision-closes-at" class="text-xs font-bold text-[var(--color-text-secondary)] block">Closing Date</label>
						<input id="decision-closes-at" type="date" name="closesAt" bind:value={pollClosesAt} class="input input-bordered input-sm w-full text-xs font-mono" />
					</div>
				</div>
				<div class="flex justify-end gap-2 pt-2 border-t border-[var(--color-border)]">
					<button type="button" onclick={() => (showNewPollModal = false)} class="px-4 py-2 rounded-xl text-xs font-bold border border-[var(--color-border)]">Cancel</button>
					<button type="submit" disabled={isSubmitting} class="btn bg-[var(--color-primary)] text-white border-0 text-xs font-bold px-4 py-2 rounded-xl">
						{isSubmitting ? 'Publishing...' : 'Publish Decision'}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}
