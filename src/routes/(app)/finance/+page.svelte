<script lang="ts">
	import {
		Landmark,
		TrendingUp,
		TrendingDown,
		ShieldAlert,
		Plus,
		X,
		FileText,
		Calendar,
		DollarSign,
		CreditCard,
		Trash2,
		CheckCircle2,
		AlertCircle,
		Filter,
		Lock
	} from 'lucide-svelte';
	import { enhance } from '$app/forms';

	let { data, form } = $props();

	let showAddModal = $state(false);
	let isSubmitting = $state(false);
	let selectedAccountFilter = $state('all');
	let selectedTypeFilter = $state('all');
	let searchQuery = $state('');

	// Direction state for modal
	let modalDirection = $state<'income' | 'expense'>('expense');
	let modalAccount = $state('Operating Account');
	let modalType = $state('maintenance_expense');
	let modalAmount = $state('');
	let modalDate = $state(new Date().toISOString().split('T')[0]);
	let modalDescription = $state('');

	function formatZar(cents: number): string {
		const isNegative = cents < 0;
		const absCents = Math.abs(cents);
		const rands = (absCents / 100).toLocaleString('en-ZA', {
			minimumFractionDigits: 2,
			maximumFractionDigits: 2
		});
		return `${isNegative ? '-' : ''}R ${rands}`;
	}

	const filteredRecords = $derived(
		data.records.filter((r) => {
			const matchesAccount =
				selectedAccountFilter === 'all' || r.accountName === selectedAccountFilter;
			const matchesType =
				selectedTypeFilter === 'all' || r.transactionType === selectedTypeFilter;
			const matchesSearch =
				!searchQuery.trim() ||
				r.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
				r.accountName.toLowerCase().includes(searchQuery.toLowerCase()) ||
				r.author?.name?.toLowerCase().includes(searchQuery.toLowerCase());
			return matchesAccount && matchesType && matchesSearch;
		})
	);

	const isSecretary = $derived(data.user?.roles?.includes('secretary'));
</script>

<svelte:head>
	<title>Executive Finance & Accounts — ACNRPLO</title>
</svelte:head>

<div class="space-y-6 pb-16">
	<!-- Executive Header Banner -->
	<div class="relative overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-6 sm:p-8 shadow-sm">
		<div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
			<div>
				<div class="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
					<Lock class="w-4 h-4" />
					Executive Committee & Secretary Only
				</div>
				<h1 class="text-2xl sm:text-3xl font-extrabold tracking-tight mt-1">
					Reserve Financial Accounts & Ledgers
				</h1>
				<p class="text-xs sm:text-sm text-[var(--color-text-secondary)] mt-1 max-w-2xl">
					Audited fiduciary records for Atherstone Collaborative Nature Reserve. Levies, game capture revenues, anti-poaching security, and infrastructure expenditure.
				</p>
			</div>

			<div class="flex flex-wrap items-center gap-3">
				<button
					type="button"
					onclick={() => (showAddModal = true)}
					class="btn bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary)]/90 border-0 flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold shadow-sm text-sm"
				>
					<Plus class="w-4 h-4" />
					Record Transaction
				</button>
			</div>
		</div>
	</div>

	<!-- Alert Messages -->
	{#if form?.error}
		<div class="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200 flex items-center gap-3 text-sm">
			<AlertCircle class="w-5 h-5 shrink-0" />
			<span>{form.error}</span>
		</div>
	{/if}

	{#if form?.success}
		<div class="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-200 flex items-center gap-3 text-sm">
			<CheckCircle2 class="w-5 h-5 shrink-0" />
			<span>Transaction successfully recorded and committed to the immutable audit trail.</span>
		</div>
	{/if}

	<!-- 4 Top Executive KPI Metric Cards -->
	<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
		<!-- Total Reserve Liquidity -->
		<div class="bg-[var(--color-bg-surface)] p-5 rounded-2xl border border-[var(--color-border)] shadow-sm space-y-1">
			<div class="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">
				<span>Total Reserve Liquidity</span>
				<Landmark class="w-4 h-4 text-[var(--color-primary)]" />
			</div>
			<div class="text-2xl font-black tabular-nums {data.metrics.totalLiquidityCents >= 0 ? 'text-[var(--color-primary)]' : 'text-rose-600'}">
				{formatZar(data.metrics.totalLiquidityCents)}
			</div>
			<div class="text-[11px] text-[var(--color-text-secondary)]">
				Consolidated across all 4 reserve accounts
			</div>
		</div>

		<!-- Operating Account -->
		<div class="bg-[var(--color-bg-surface)] p-5 rounded-2xl border border-[var(--color-border)] shadow-sm space-y-1">
			<div class="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">
				<span>Operating Account</span>
				<CreditCard class="w-4 h-4 text-emerald-600" />
			</div>
			<div class="text-2xl font-black text-emerald-600 tabular-nums">
				{formatZar(data.metrics.operatingBalanceCents)}
			</div>
			<div class="text-[11px] text-[var(--color-text-secondary)]">
				Current working capital for reserve upkeep
			</div>
		</div>

		<!-- Reserve Capital Fund -->
		<div class="bg-[var(--color-bg-surface)] p-5 rounded-2xl border border-[var(--color-border)] shadow-sm space-y-1">
			<div class="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">
				<span>Reserve Capital Fund</span>
				<TrendingUp class="w-4 h-4 text-blue-600" />
			</div>
			<div class="text-2xl font-black text-blue-600 tabular-nums">
				{formatZar(data.metrics.capitalFundCents)}
			</div>
			<div class="text-[11px] text-[var(--color-text-secondary)]">
				Protected emergency & infrastructure capital
			</div>
		</div>

		<!-- Anti-Poaching & Boma -->
		<div class="bg-[var(--color-bg-surface)] p-5 rounded-2xl border border-[var(--color-border)] shadow-sm space-y-1">
			<div class="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">
				<span>Boma & APU Funds</span>
				<ShieldAlert class="w-4 h-4 text-amber-600" />
			</div>
			<div class="text-2xl font-black text-amber-700 dark:text-amber-400 tabular-nums">
				{formatZar(data.metrics.antiPoachingCents + data.metrics.bomaCents)}
			</div>
			<div class="text-[11px] text-[var(--color-text-secondary)]">
				Boma: {formatZar(data.metrics.bomaCents)} | APU: {formatZar(data.metrics.antiPoachingCents)}
			</div>
		</div>
	</div>

	<!-- Filter & Search Controls -->
	<div class="bg-[var(--color-bg-surface)] p-4 rounded-xl border border-[var(--color-border)] shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
		<div class="flex flex-wrap items-center gap-2 w-full md:w-auto">
			<div class="flex items-center gap-1.5 text-xs font-bold text-[var(--color-text-secondary)]">
				<Filter class="w-3.5 h-3.5" />
				Account:
			</div>
			<select
				bind:value={selectedAccountFilter}
				class="select select-sm border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-base)] text-xs font-medium"
			>
				<option value="all">All Reserve Accounts</option>
				<option value="Operating Account">Operating Account</option>
				<option value="Reserve Capital Fund">Reserve Capital Fund</option>
				<option value="Emergency Anti-Poaching Fund">Emergency Anti-Poaching Fund</option>
				<option value="Boma Operations">Boma Operations</option>
			</select>

			<div class="flex items-center gap-1.5 text-xs font-bold text-[var(--color-text-secondary)] ml-2">
				Type:
			</div>
			<select
				bind:value={selectedTypeFilter}
				class="select select-sm border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-base)] text-xs font-medium"
			>
				<option value="all">All Categories</option>
				<option value="levy_income">Member Levies (Income)</option>
				<option value="boma_sales_revenue">Game Auction / Boma (Income)</option>
				<option value="maintenance_expense">Infrastructure & Fencing (Expense)</option>
				<option value="anti_poaching">Anti-Poaching Security (Expense)</option>
				<option value="legal_audit">Legal & Ecological Audit (Expense)</option>
				<option value="operational_expense">General Operational (Expense)</option>
			</select>
		</div>

		<div class="w-full md:w-72">
			<input
				type="text"
				bind:value={searchQuery}
				placeholder="Search description or recorded by..."
				class="input input-sm w-full border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-base)] text-xs"
			/>
		</div>
	</div>

	<!-- Financial Ledger Table -->
	<div class="bg-[var(--color-bg-surface)] rounded-2xl border border-[var(--color-border)] shadow-sm overflow-hidden">
		<div class="p-4 sm:p-5 border-b border-[var(--color-border)] flex items-center justify-between">
			<div>
				<h2 class="font-extrabold text-base text-[var(--color-text-primary)]">
					Reserve Financial Ledger ({filteredRecords.length})
				</h2>
				<p class="text-xs text-[var(--color-text-secondary)]">
					All debits and credits recorded under executive oversight.
				</p>
			</div>
			<div class="text-xs font-mono text-[var(--color-text-secondary)]">
				Currency: ZAR (South African Rand)
			</div>
		</div>

		<div class="overflow-x-auto">
			<table class="table table-zebra w-full text-left text-sm">
				<thead class="bg-[var(--color-bg-base)] border-b border-[var(--color-border)] text-xs font-bold uppercase text-[var(--color-text-secondary)]">
					<tr>
						<th class="py-3 px-4">Date</th>
						<th class="py-3 px-4">Account</th>
						<th class="py-3 px-4">Category</th>
						<th class="py-3 px-4">Description</th>
						<th class="py-3 px-4 text-right">Amount</th>
						<th class="py-3 px-4">Logged By</th>
						{#if isSecretary}
							<th class="py-3 px-4 text-center">Action</th>
						{/if}
					</tr>
				</thead>
				<tbody class="divide-y divide-[var(--color-border)]">
					{#each filteredRecords as r}
						<tr class="hover:bg-[var(--color-border)]/20 transition-colors">
							<!-- Date -->
							<td class="py-3 px-4 font-mono text-xs whitespace-nowrap">
								{r.date}
							</td>

							<!-- Account -->
							<td class="py-3 px-4 font-semibold text-xs whitespace-nowrap">
								{r.accountName}
							</td>

							<!-- Category Badge -->
							<td class="py-3 px-4 whitespace-nowrap">
								<span
									class="px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider {r.transactionType ===
									'levy_income'
										? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
										: r.transactionType === 'boma_sales_revenue'
											? 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300'
											: r.transactionType === 'anti_poaching'
												? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
												: r.transactionType === 'maintenance_expense'
													? 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300'
													: 'bg-stone-100 text-stone-800 dark:bg-stone-800 dark:text-stone-300'}"
								>
									{r.transactionType.replace('_', ' ')}
								</span>
							</td>

							<!-- Description -->
							<td class="py-3 px-4 text-xs font-medium max-w-md">
								{r.description}
							</td>

							<!-- Amount -->
							<td class="py-3 px-4 text-right font-mono font-bold whitespace-nowrap tabular-nums {r.amountCents >= 0 ? 'text-emerald-600' : 'text-rose-600'}">
								{r.amountCents >= 0 ? '+' : ''}{formatZar(r.amountCents)}
							</td>

							<!-- Logged By -->
							<td class="py-3 px-4 text-xs text-[var(--color-text-secondary)] whitespace-nowrap">
								{r.author?.name || 'Executive'}
							</td>

							<!-- Action -->
							{#if isSecretary}
								<td class="py-3 px-4 text-center">
									<form
										method="POST"
										action="?/deleteRecord"
										use:enhance
										onsubmit={(e) => {
											if (!confirm('Are you sure you want to remove this financial entry? This deletion will be logged in the audit trail.')) {
												e.preventDefault();
											}
										}}
									>
										<input type="hidden" name="id" value={r.id} />
										<button
											type="submit"
											aria-label="Delete entry"
											class="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"
											title="Delete entry"
										>
											<Trash2 class="w-4 h-4" />
										</button>
									</form>
								</td>
							{/if}
						</tr>
					{:else}
						<tr>
							<td colspan={isSecretary ? 7 : 6} class="py-12 text-center text-xs text-[var(--color-text-secondary)]">
								No financial records match the selected account or category criteria.
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>
</div>

<!-- Add Transaction Modal -->
{#if showAddModal}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
		<div class="bg-[var(--color-bg-surface)] border border-[var(--color-border)] rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
			<div class="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
				<div class="flex items-center gap-2">
					<div class="w-8 h-8 rounded-lg bg-[var(--color-primary)] text-white flex items-center justify-center">
						<DollarSign class="w-4 h-4" />
					</div>
					<div>
						<h3 class="font-extrabold text-base">Record Financial Transaction</h3>
						<p class="text-xs text-[var(--color-text-secondary)]">Post entry to executive ledger</p>
					</div>
				</div>
				<button
					type="button"
					onclick={() => (showAddModal = false)}
					class="p-1.5 rounded-lg hover:bg-[var(--color-border)]/50 text-[var(--color-text-secondary)]"
				>
					<X class="w-4 h-4" />
				</button>
			</div>

			<form
				method="POST"
				action="?/createRecord"
				use:enhance={() => {
					isSubmitting = true;
					return async ({ update }) => {
						isSubmitting = false;
						showAddModal = false;
						await update();
					};
				}}
				class="space-y-4"
			>
				<!-- Direction Selector (Income vs Expense) -->
				<div class="grid grid-cols-2 gap-2 p-1 bg-[var(--color-bg-base)] rounded-xl border border-[var(--color-border)]">
					<button
						type="button"
						onclick={() => {
							modalDirection = 'income';
							modalType = 'levy_income';
						}}
						class="py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 {modalDirection === 'income'
							? 'bg-emerald-600 text-white shadow-sm'
							: 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'}"
					>
						<TrendingUp class="w-4 h-4" />
						Income / Inflow (+)
					</button>
					<button
						type="button"
						onclick={() => {
							modalDirection = 'expense';
							modalType = 'maintenance_expense';
						}}
						class="py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 {modalDirection === 'expense'
							? 'bg-rose-600 text-white shadow-sm'
							: 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'}"
					>
						<TrendingDown class="w-4 h-4" />
						Expense / Outflow (-)
					</button>
				</div>
				<input type="hidden" name="direction" value={modalDirection} />

				<!-- Account Name -->
				<div class="space-y-1">
					<label for="accountName" class="text-xs font-bold text-[var(--color-text-secondary)]">Target Reserve Account</label>
					<select
						id="accountName"
						name="accountName"
						bind:value={modalAccount}
						required
						class="select select-bordered w-full bg-[var(--color-bg-base)] text-xs font-medium"
					>
						<option value="Operating Account">Operating Account</option>
						<option value="Reserve Capital Fund">Reserve Capital Fund</option>
						<option value="Emergency Anti-Poaching Fund">Emergency Anti-Poaching Fund</option>
						<option value="Boma Operations">Boma Operations</option>
					</select>
				</div>

				<!-- Transaction Type -->
				<div class="space-y-1">
					<label for="transactionType" class="text-xs font-bold text-[var(--color-text-secondary)]">Category</label>
					<select
						id="transactionType"
						name="transactionType"
						bind:value={modalType}
						required
						class="select select-bordered w-full bg-[var(--color-bg-base)] text-xs font-medium"
					>
						{#if modalDirection === 'income'}
							<option value="levy_income">Annual Member Operational Levies</option>
							<option value="boma_sales_revenue">Live Game Auction / Boma Revenue</option>
							<option value="interest_other">Investment Yield / Other Revenue</option>
						{:else}
							<option value="maintenance_expense">Infrastructure, Road Grading & Fences</option>
							<option value="anti_poaching">Anti-Poaching Unit (APU) Security & Patrols</option>
							<option value="legal_audit">Legal, Constitution Review & Ecological Audit</option>
							<option value="operational_expense">General Reserve Operations & Fuel</option>
						{/if}
					</select>
				</div>

				<!-- Amount in ZAR -->
				<div class="grid grid-cols-2 gap-3">
					<div class="space-y-1">
						<label for="amountZar" class="text-xs font-bold text-[var(--color-text-secondary)]">Amount (ZAR)</label>
						<div class="relative">
							<span class="absolute left-3 top-2.5 text-xs font-bold text-[var(--color-text-secondary)]">R</span>
							<input
								id="amountZar"
								type="number"
								name="amountZar"
								step="0.01"
								min="0.01"
								required
								placeholder="0.00"
								bind:value={modalAmount}
								class="input input-bordered w-full pl-8 bg-[var(--color-bg-base)] text-xs font-mono font-bold"
							/>
						</div>
					</div>

					<!-- Date -->
					<div class="space-y-1">
						<label for="date" class="text-xs font-bold text-[var(--color-text-secondary)]">Transaction Date</label>
						<input
							id="date"
							type="date"
							name="date"
							required
							bind:value={modalDate}
							class="input input-bordered w-full bg-[var(--color-bg-base)] text-xs font-mono"
						/>
					</div>
				</div>

				<!-- Description / Memo -->
				<div class="space-y-1">
					<label for="description" class="text-xs font-bold text-[var(--color-text-secondary)]">Description / Memo</label>
					<input
						id="description"
						type="text"
						name="description"
						required
						placeholder="e.g. Invoice #2026-44: Firebreak grading Portion 2 & 4"
						bind:value={modalDescription}
						class="input input-bordered w-full bg-[var(--color-bg-base)] text-xs"
					/>
				</div>

				<!-- Actions -->
				<div class="flex items-center justify-end gap-2 pt-2 border-t border-[var(--color-border)]">
					<button
						type="button"
						onclick={() => (showAddModal = false)}
						class="px-4 py-2 rounded-xl text-xs font-bold border border-[var(--color-border)] hover:bg-[var(--color-border)]/30"
					>
						Cancel
					</button>
					<button
						type="submit"
						disabled={isSubmitting}
						class="btn bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary)]/90 border-0 px-5 py-2 rounded-xl text-xs font-bold"
					>
						{isSubmitting ? 'Posting...' : 'Post Transaction'}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}
