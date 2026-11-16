<script lang="ts">
	import {
		CreditCard,
		Plus,
		Search,
		CheckCircle2,
		AlertCircle,
		X,
		TrendingUp,
		TrendingDown,
		Filter
	} from 'lucide-svelte';
	import { enhance } from '$app/forms';

	let { data, form } = $props();

	let showNewFinModal = $state(false);
	let searchQuery = $state('');
	let accountFilter = $state('all');
	let directionFilter = $state<'all' | 'income' | 'expense'>('all');

	// Form values for Finance
	let finAccount = $state('Operating Account');
	let finDirection = $state<'income' | 'expense'>('expense');
	let finType = $state('maintenance_expense');
	let finAmount = $state('');
	let finDate = $state(new Date().toISOString().split('T')[0]);
	let finDescription = $state('');

	function formatZar(cents: number): string {
		const isNegative = cents < 0;
		const abs = Math.abs(cents);
		return `${isNegative ? '-' : ''}R ${(abs / 100).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`;
	}

	const filteredRecords = $derived(
		(data.records || []).filter((r: any) => {
			const q = searchQuery.trim().toLowerCase();
			const matchesQuery =
				!q ||
				r.description.toLowerCase().includes(q) ||
				r.accountName.toLowerCase().includes(q) ||
				(r.author?.name && r.author.name.toLowerCase().includes(q));

			const matchesAccount = accountFilter === 'all' || r.accountName === accountFilter;
			const matchesDirection =
				directionFilter === 'all' ||
				(directionFilter === 'income' && r.amountCents > 0) ||
				(directionFilter === 'expense' && r.amountCents < 0);

			return matchesQuery && matchesAccount && matchesDirection;
		})
	);
</script>

<svelte:head>
	<title>Executive Financial Ledger — ACNRPLO</title>
</svelte:head>

<div class="space-y-6">
	<!-- Section Title & Sub-Nav Header -->
	<div class="bg-[var(--color-bg-surface)] border border-[var(--color-border)] rounded-2xl p-4 sm:p-6 shadow-sm">
		<div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
			<div>
				<div class="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-purple-700 dark:text-purple-400">
					<CreditCard class="w-4 h-4" />
					Treasury & Fiduciary Ledger
				</div>
				<h1 class="text-2xl sm:text-3xl font-extrabold tracking-tight mt-1">
					Executive Finance
				</h1>
				<p class="text-xs sm:text-sm text-[var(--color-text-secondary)] mt-1 max-w-2xl">
					Reserve treasury accounting, operational levy settlements, live game boma revenues, and perimeter infrastructure expenditure.
				</p>
			</div>

			<!-- Action Button -->
			<div>
				<button
					type="button"
					onclick={() => (showNewFinModal = true)}
					class="btn bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary)]/90 border-0 flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold shadow-xs"
				>
					<Plus class="w-4 h-4" />
					Post Transaction
				</button>
			</div>
		</div>

		<!-- Treasury Account Balance Cards -->
		<div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mt-6 pt-6 border-t border-[var(--color-border)]">
			<div class="p-3.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-base)]/60">
				<div class="text-xs font-bold text-[var(--color-text-secondary)]">Total Reserve Liquidity</div>
				<div class="text-xl font-extrabold font-mono text-emerald-600 mt-1">
					{formatZar(data.balances.totalLiquidityCents)}
				</div>
				<div class="text-[11px] text-[var(--color-text-secondary)]">Consolidated Reserve Trust</div>
			</div>

			<div class="p-3.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-base)]/60">
				<div class="text-xs font-bold text-[var(--color-text-secondary)]">Operating Account</div>
				<div class="text-xl font-extrabold font-mono mt-1">
					{formatZar(data.balances.operatingBalanceCents)}
				</div>
				<div class="text-[11px] text-[var(--color-text-secondary)]">Roads, staff & power</div>
			</div>

			<div class="p-3.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-base)]/60">
				<div class="text-xs font-bold text-[var(--color-text-secondary)]">Reserve Capital Fund</div>
				<div class="text-xl font-extrabold font-mono mt-1">
					{formatZar(data.balances.capitalFundCents)}
				</div>
				<div class="text-[11px] text-[var(--color-text-secondary)]">Infrastructure endowment</div>
			</div>

			<div class="p-3.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-base)]/60">
				<div class="text-xs font-bold text-[var(--color-text-secondary)]">Emergency APU Fund</div>
				<div class="text-xl font-extrabold font-mono mt-1">
					{formatZar(data.balances.apuFundCents)}
				</div>
				<div class="text-[11px] text-[var(--color-text-secondary)]">Tactical security & fuel</div>
			</div>

			<div class="p-3.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-base)]/60">
				<div class="text-xs font-bold text-[var(--color-text-secondary)]">Boma Operations</div>
				<div class="text-xl font-extrabold font-mono mt-1">
					{formatZar(data.balances.bomaFundCents)}
				</div>
				<div class="text-[11px] text-[var(--color-text-secondary)]">Auction & off-take capture</div>
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
			<span>Financial transaction successfully posted and audited.</span>
		</div>
	{/if}

	<!-- Transactions Ledger Table -->
	<div class="bg-[var(--color-bg-surface)] rounded-2xl border border-[var(--color-border)] shadow-sm overflow-hidden p-6 space-y-4">
		<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
			<div>
				<h2 class="font-bold text-base flex items-center gap-2">
					<CreditCard class="w-4 h-4 text-[var(--color-primary)]" />
					Transaction Journal ({filteredRecords.length})
				</h2>
				<p class="text-xs text-[var(--color-text-secondary)] mt-0.5">
					Double-entry verified records posted to reserve accounts.
				</p>
			</div>

			<!-- Filters -->
			<div class="flex flex-wrap items-center gap-2">
				<select
					bind:value={accountFilter}
					class="select select-bordered select-sm text-xs rounded-xl"
				>
					<option value="all">All Accounts</option>
					<option value="Operating Account">Operating Account</option>
					<option value="Reserve Capital Fund">Reserve Capital Fund</option>
					<option value="Emergency Anti-Poaching Fund">Emergency APU Fund</option>
					<option value="Boma Operations">Boma Operations</option>
				</select>

				<select
					bind:value={directionFilter}
					class="select select-bordered select-sm text-xs rounded-xl"
				>
					<option value="all">All Flows</option>
					<option value="income">Inflows (+)</option>
					<option value="expense">Outflows (-)</option>
				</select>

				<div class="relative w-full sm:w-56">
					<Search class="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]" />
					<input
						type="text"
						placeholder="Search transactions..."
						bind:value={searchQuery}
						class="input input-bordered input-sm w-full pl-9 text-xs rounded-xl"
					/>
				</div>
			</div>
		</div>

		<div class="overflow-x-auto">
			<table class="w-full text-left text-xs">
				<thead>
					<tr class="border-b border-[var(--color-border)] text-[var(--color-text-secondary)] font-bold uppercase tracking-wider text-[10px]">
						<th class="py-3 px-4">Date</th>
						<th class="py-3 px-4">Account</th>
						<th class="py-3 px-4">Classification</th>
						<th class="py-3 px-4">Description</th>
						<th class="py-3 px-4 text-right">Amount (ZAR)</th>
						<th class="py-3 px-4">Posted By</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-[var(--color-border)]">
					{#each filteredRecords as r}
						<tr class="hover:bg-[var(--color-border)]/20 transition-colors">
							<td class="py-3 px-4 font-mono text-xs">{r.date}</td>
							<td class="py-3 px-4 font-semibold text-xs">{r.accountName}</td>
							<td class="py-3 px-4">
								<span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-stone-100 dark:bg-stone-800">
									{r.transactionType.replace('_', ' ')}
								</span>
							</td>
							<td class="py-3 px-4 text-xs max-w-sm truncate">{r.description}</td>
							<td class="py-3 px-4 text-right font-mono font-bold text-xs {r.amountCents >= 0 ? 'text-emerald-600' : 'text-rose-600'}">
								{r.amountCents >= 0 ? '+' : ''}{formatZar(r.amountCents)}
							</td>
							<td class="py-3 px-4 text-xs text-[var(--color-text-secondary)]">
								{r.author?.name || 'Secretary'}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>
</div>

<!-- Post Financial Record Modal -->
{#if showNewFinModal}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
		<div class="bg-[var(--color-bg-surface)] border border-[var(--color-border)] rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
			<div class="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
				<h3 class="font-extrabold text-base">Post Financial Record</h3>
				<button type="button" onclick={() => (showNewFinModal = false)} class="p-1 rounded-lg hover:bg-[var(--color-border)]/40"><X class="w-4 h-4" /></button>
			</div>
			<form method="POST" action="?/createFinancialRecord" use:enhance={() => async ({ update }) => { showNewFinModal = false; await update(); }} class="space-y-4">
				<div class="grid grid-cols-2 gap-2 p-1 bg-[var(--color-bg-base)] rounded-xl border border-[var(--color-border)]">
					<button type="button" onclick={() => (finDirection = 'income')} class="py-1.5 text-xs font-bold rounded-lg {finDirection === 'income' ? 'bg-emerald-600 text-white' : 'text-stone-600'}">Inflow (+)</button>
					<button type="button" onclick={() => (finDirection = 'expense')} class="py-1.5 text-xs font-bold rounded-lg {finDirection === 'expense' ? 'bg-rose-600 text-white' : 'text-stone-600'}">Outflow (-)</button>
				</div>
				<input type="hidden" name="direction" value={finDirection} />
				<div class="grid grid-cols-2 gap-3">
					<div class="space-y-1">
						<label class="text-xs font-bold text-[var(--color-text-secondary)]">Account</label>
						<select name="accountName" bind:value={finAccount} class="select select-bordered select-sm w-full text-xs">
							<option value="Operating Account">Operating Account</option>
							<option value="Reserve Capital Fund">Reserve Capital Fund</option>
							<option value="Emergency Anti-Poaching Fund">Emergency Anti-Poaching Fund</option>
							<option value="Boma Operations">Boma Operations</option>
						</select>
					</div>
					<div class="space-y-1">
						<label class="text-xs font-bold text-[var(--color-text-secondary)]">Category</label>
						<select name="transactionType" bind:value={finType} class="select select-bordered select-sm w-full text-xs">
							{#if finDirection === 'income'}
								<option value="levy_income">Member Operational Levies</option>
								<option value="boma_sales_revenue">Game Auction / Boma Revenue</option>
							{:else}
								<option value="maintenance_expense">Infrastructure & Fencing</option>
								<option value="anti_poaching">Anti-Poaching Security</option>
								<option value="legal_audit">Legal & Ecological Audit</option>
								<option value="operational_expense">General Operations</option>
							{/if}
						</select>
					</div>
				</div>
				<div class="grid grid-cols-2 gap-3">
					<div class="space-y-1">
						<label class="text-xs font-bold text-[var(--color-text-secondary)]">Amount (ZAR)</label>
						<input type="number" step="0.01" min="0.01" name="amountZar" required placeholder="0.00" bind:value={finAmount} class="input input-bordered input-sm w-full text-xs font-mono font-bold" />
					</div>
					<div class="space-y-1">
						<label class="text-xs font-bold text-[var(--color-text-secondary)]">Date</label>
						<input type="date" name="date" required bind:value={finDate} class="input input-bordered input-sm w-full text-xs font-mono" />
					</div>
				</div>
				<div class="space-y-1">
					<label class="text-xs font-bold text-[var(--color-text-secondary)]">Description</label>
					<input type="text" name="description" required placeholder="e.g. Invoice #2026-44: Road grading" bind:value={finDescription} class="input input-bordered input-sm w-full text-xs" />
				</div>
				<div class="flex justify-end gap-2 pt-2 border-t border-[var(--color-border)]">
					<button type="button" onclick={() => (showNewFinModal = false)} class="px-4 py-2 rounded-xl text-xs font-bold border border-[var(--color-border)]">Cancel</button>
					<button type="submit" class="btn bg-[var(--color-primary)] text-white border-0 text-xs font-bold px-4 py-2 rounded-xl">Commit Transaction</button>
				</div>
			</form>
		</div>
	</div>
{/if}
