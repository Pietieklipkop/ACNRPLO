<script lang="ts">
	import {
		SlidersHorizontal,
		Tag,
		Palette,
		Landmark,
		Crosshair,
		CreditCard,
		Plus,
		Search,
		CheckCircle2,
		AlertCircle,
		Edit3,
		X,
		Check,
		Filter,
		ArrowRight,
		ShieldCheck,
		Layers,
		Users,
		ShoppingCart,
		Download,
		Trash2,
		History,
		RotateCcw,
		Calendar,
		Sparkles
	} from 'lucide-svelte';
	import { enhance } from '$app/forms';
	import { VISIT_ICON_OPTIONS, getVisitIconComponent } from '$lib/constants/visit-icons';

	let { data, form } = $props();

	// Active Dataset Filter ('species' | 'categories' | 'portions' | 'quotas' | 'finance')
	let activeDataset = $state<'species' | 'categories' | 'portions' | 'quotas' | 'finance'>('species');

	// Search queries
	let speciesSearch = $state('');
	let categoryFilter = $state('all');
	let categorySearch = $state('');
	let portionsSearch = $state('');
	let financeSearch = $state('');

	// Modal States
	let showNewSpeciesModal = $state(false);
	let editingSpecies = $state<any | null>(null);
	let showNewCategoryModal = $state(false);
	let editingCategory = $state<any | null>(null);
	let showNewPortionModal = $state(false);
	let showNewQuotaModal = $state(false);
	let editingQuota = $state<any | null>(null);
	let allocatingQuota = $state<any | null>(null);

	// Form values for Species
	let newSpeciesName = $state('');
	let newSpeciesCategory = $state<string>('plains_game');
	let newSpeciesPriceZar = $state('0');

	// Form values for Species Edit
	let editSpeciesId = $state('');
	let editSpeciesName = $state('');
	let editSpeciesCategory = $state<string>('plains_game');
	let editSpeciesPriceZar = $state('0');

	// Form values for Category
	let newCatKey = $state('');
	let newCatLabel = $state('');
	let newCatIcon = $state('Compass');
	let newCatColorHex = $state('#10b981');
	let newCatDescription = $state('');

	// Form values for Category Edit
	let editCatId = $state('');
	let editCatKey = $state('');
	let editCatLabel = $state('');
	let editCatIcon = $state('Compass');
	let editCatColorHex = $state('#10b981');
	let editCatDescription = $state('');
	let deletingCategory = $state<any | null>(null);

	// Form values for Portion
	let portionUserId = $state('');
	let portionName = $state('');
	let portionHectares = $state('');
	let portionBps = $state('');
	let portionNotes = $state('');

	// Form values for New Quota
	let newQuotaYear = $state(2026);
	let newQuotaCategory = $state<string>('plo');
	let newQuotaSubcategory = $state<string>('hunting');
	let newQuotaSpecies = $state('');
	let newQuotaAllocation = $state(10);
	let newQuotaUnitPriceZar = $state('5000');
	let newQuotaNotes = $state('');

	// Form values for Quota Edit
	let editQuotaId = $state('');
	let editQuotaYear = $state(2026);
	let editQuotaCategory = $state<string>('plo');
	let editQuotaSubcategory = $state<string>('hunting');
	let editQuotaSpecies = $state('');
	let editQuotaAllocation = $state(0);
	let editQuotaUnitPriceZar = $state('0');
	let editQuotaNotes = $state('');

	// Quota Filters
	let quotaYearFilter = $state('2026'); // Defaults to current year (2026)
	let quotaCategoryFilter = $state('all'); // 'all' | 'plo' | 'ledet'
	let quotaSubcategoryFilter = $state('all'); // 'all' | 'hunting' | 'selling'
	let quotaSpeciesSearch = $state('');

	// PLO Landowner Allocation Values for Current Modal
	let allocationValues = $state<Record<string, number>>({});

	function openAllocationModal(quota: any) {
		allocatingQuota = quota;
		const initVals: Record<string, number> = {};
		for (const landowner of data.ploLandowners || []) {
			const existing = (quota.allocations || []).find((a: any) => a.userId === landowner.id);
			initVals[landowner.id] = existing ? existing.allocatedHead : 0;
		}
		allocationValues = initVals;
	}

	function autoDistributeProportional() {
		if (!allocatingQuota) return;
		const total = allocatingQuota.totalAllocation || 0;
		const nextVals: Record<string, number> = {};
		for (const landowner of data.ploLandowners || []) {
			const bps = landowner.ownershipBps || 0;
			nextVals[landowner.id] = Math.round(total * (bps / 10000));
		}
		allocationValues = nextVals;
	}

	const totalAllocatedHead = $derived(
		Object.values(allocationValues).reduce((sum, n) => sum + (Number(n) || 0), 0)
	);

	const availableQuotaYears = $derived(
		Array.from(new Set((data.quotas || []).map((q: any) => q.year))).sort((a: any, b: any) => b - a)
	);

	const filteredQuotas = $derived(
		(data.quotas || []).filter((q: any) => {
			const matchesYear = quotaYearFilter === 'all' || q.year.toString() === quotaYearFilter;
			const matchesCategory = quotaCategoryFilter === 'all' || q.category === quotaCategoryFilter;
			const matchesSubcategory = quotaSubcategoryFilter === 'all' || q.subcategory === quotaSubcategoryFilter;
			const s = quotaSpeciesSearch.trim().toLowerCase();
			const matchesSpecies = !s || q.species.toLowerCase().includes(s);
			return matchesYear && matchesCategory && matchesSubcategory && matchesSpecies;
		})
	);

	function formatZar(cents: number): string {
		const isNegative = cents < 0;
		const abs = Math.abs(cents);
		return `${isNegative ? '-' : ''}R ${(abs / 100).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`;
	}

	const filteredSpecies = $derived(
		(data.masterSpecies || []).filter((s: any) => {
			const q = speciesSearch.trim().toLowerCase();
			const matchesQuery = !q || s.name.toLowerCase().includes(q) || s.category.toLowerCase().includes(q);
			const matchesCategory = categoryFilter === 'all' || s.category === categoryFilter;
			return matchesQuery && matchesCategory;
		})
	);

	const filteredPortions = $derived(
		(data.landPortions || []).filter((p: any) => {
			const q = portionsSearch.trim().toLowerCase();
			if (!q) return true;
			return (
				p.portionName.toLowerCase().includes(q) ||
				(p.owner?.name && p.owner.name.toLowerCase().includes(q))
			);
		})
	);

	const filteredCategories = $derived(
		(data.masterVisitCategories || []).filter((cat: any) => {
			const q = categorySearch.trim().toLowerCase();
			if (!q) return true;
			return (
				cat.label.toLowerCase().includes(q) ||
				cat.key.toLowerCase().includes(q) ||
				(cat.description || '').toLowerCase().includes(q)
			);
		})
	);

	const masterFinancialAccounts = [
		{
			id: 'acc-ops',
			code: 'ACC-1001',
			name: 'Operating Account',
			category: 'Primary Trust',
			badgeColor: 'blue',
			description: 'Daily reserve maintenance, road grading, perimeter electricity, and operational staff payroll.',
			status: 'Statutory Active'
		},
		{
			id: 'acc-cap',
			code: 'ACC-2001',
			name: 'Reserve Capital Fund',
			category: 'Endowment Fund',
			badgeColor: 'purple',
			description: 'Long-term infrastructure endowment, borehole installations, solar backup, and dam construction.',
			status: 'Audited Fiduciary'
		},
		{
			id: 'acc-apu',
			code: 'ACC-3001',
			name: 'Emergency APU Fund',
			category: 'Security & APU',
			badgeColor: 'rose',
			description: 'Anti-Poaching Unit tactical patrols, thermal drone surveillance, night vision optics, and rapid response fuel.',
			status: 'Ring-Fenced Active'
		},
		{
			id: 'acc-boma',
			code: 'ACC-4001',
			name: 'Boma Operations',
			category: 'Commercial Reserve',
			badgeColor: 'emerald',
			description: 'Surplus live game capture, quarantine holding pens, and annual auction revenue settlement.',
			status: 'Commercial Active'
		}
	];

	const filteredFinancialAccounts = $derived(
		masterFinancialAccounts.filter((acc) => {
			const q = financeSearch.trim().toLowerCase();
			if (!q) return true;
			return (
				acc.name.toLowerCase().includes(q) ||
				acc.code.toLowerCase().includes(q) ||
				acc.category.toLowerCase().includes(q) ||
				acc.description.toLowerCase().includes(q)
			);
		})
	);
</script>

<svelte:head>
	<title>Reserve Master Data Registers — ACNRPLO</title>
</svelte:head>

<div class="space-y-6">
	<!-- Section Title Header -->
	<div class="bg-[var(--color-bg-surface)] border border-[var(--color-border)] rounded-2xl p-4 sm:p-6 shadow-sm space-y-4">
		<div>
			<div class="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-purple-700 dark:text-purple-400">
				<SlidersHorizontal class="w-4 h-4" />
				Centralized System Architecture
			</div>
			<h1 class="text-2xl sm:text-3xl font-extrabold tracking-tight mt-1">
				Reserve Master Data Registers
			</h1>
			<p class="text-xs sm:text-sm text-[var(--color-text-secondary)] mt-1 max-w-3xl">
				The single authoritative configuration console for reserve wildlife taxonomy, calendar visit types & color legends, cadastral land portions, baseline quota tariffs, and financial classification accounts.
			</p>
		</div>

		<!-- Segmented Dataset Tab Navigation Bar (No 'All' Tab, No Stats Blocks) -->
		<div class="flex items-center gap-1.5 pt-2 border-t border-[var(--color-border)] overflow-x-auto pb-1">
			<button
				type="button"
				onclick={() => (activeDataset = 'species')}
				class="px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 {activeDataset === 'species'
					? 'bg-[var(--color-primary)] text-white shadow-xs'
					: 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-border)]/30'}"
			>
				<span class="flex items-center gap-1.5"><Tag class="w-3.5 h-3.5" /> Wildlife Species ({data.stats.speciesCount})</span>
			</button>
			<button
				type="button"
				onclick={() => (activeDataset = 'categories')}
				class="px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 {activeDataset === 'categories'
					? 'bg-[var(--color-primary)] text-white shadow-xs'
					: 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-border)]/30'}"
			>
				<span class="flex items-center gap-1.5"><Palette class="w-3.5 h-3.5" /> Visit Categories ({data.stats.categoriesCount})</span>
			</button>
			<button
				type="button"
				onclick={() => (activeDataset = 'portions')}
				class="px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 {activeDataset === 'portions'
					? 'bg-[var(--color-primary)] text-white shadow-xs'
					: 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-border)]/30'}"
			>
				<span class="flex items-center gap-1.5"><Landmark class="w-3.5 h-3.5" /> Cadastral Portions ({data.stats.portionsCount})</span>
			</button>
			<button
				type="button"
				onclick={() => (activeDataset = 'quotas')}
				class="px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 {activeDataset === 'quotas'
					? 'bg-[var(--color-primary)] text-white shadow-xs'
					: 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-border)]/30'}"
			>
				<span class="flex items-center gap-1.5"><Crosshair class="w-3.5 h-3.5" /> Quota Baselines ({data.stats.quotasCount})</span>
			</button>
			<button
				type="button"
				onclick={() => (activeDataset = 'finance')}
				class="px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 {activeDataset === 'finance'
					? 'bg-[var(--color-primary)] text-white shadow-xs'
					: 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-border)]/30'}"
			>
				<span class="flex items-center gap-1.5"><CreditCard class="w-3.5 h-3.5" /> Financial Chart of Accounts</span>
			</button>
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
			<span>Master dataset record successfully committed and audited.</span>
		</div>
	{/if}

	<!-- ========================================================================= -->
	<!-- DATASET 1: WILDLIFE SPECIES REGISTER -->
	<!-- ========================================================================= -->
	{#if activeDataset === 'species'}
		<div class="bg-[var(--color-bg-surface)] border border-[var(--color-border)] rounded-2xl p-6 shadow-sm space-y-4">
			<div class="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
				<div>
					<div class="flex items-center gap-2">
						<Tag class="w-5 h-5 text-[var(--color-primary)]" />
						<h2 class="font-extrabold text-base sm:text-lg">Wildlife Species Master Register ({filteredSpecies.length})</h2>
					</div>
					<p class="text-xs text-[var(--color-text-secondary)] mt-0.5">
						Feeds game census count surveys, annual carrying capacity models, hunting logs, and peer want-to-buy requests.
					</p>
				</div>
				<div class="flex flex-wrap items-center gap-2 w-full lg:w-auto">
					<select
						bind:value={categoryFilter}
						class="select select-bordered select-sm text-xs rounded-xl"
					>
						<option value="all">All Categories</option>
						<option value="plains_game">Plains Game</option>
						<option value="rare_game">Rare / Premium Game</option>
						<option value="dangerous_game">Dangerous Game</option>
						<option value="other">Other</option>
					</select>
					<div class="relative flex-1 sm:w-64 min-w-[160px]">
						<Search class="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]" />
						<input
							type="text"
							placeholder="Search species..."
							bind:value={speciesSearch}
							class="input input-bordered input-sm w-full pl-9 text-xs rounded-xl"
						/>
					</div>
					<button
						type="button"
						onclick={() => (showNewSpeciesModal = true)}
						class="btn btn-sm bg-[var(--color-primary)] text-white border-0 rounded-xl text-xs font-bold"
					>
						<Plus class="w-3.5 h-3.5" /> Add Species
					</button>
				</div>
			</div>

			<!-- Species Table -->
			<div class="overflow-x-auto">
				<table class="w-full text-left text-xs">
					<thead>
						<tr class="border-b border-[var(--color-border)] text-[var(--color-text-secondary)] font-bold uppercase tracking-wider text-[10px]">
							<th class="py-3 px-4">Common Name</th>
							<th class="py-3 px-4">Ecological Category</th>
							<th class="py-3 px-4">Indicative Tariff (ZAR)</th>
							<th class="py-3 px-4">Status</th>
							<th class="py-3 px-4 text-right">Actions</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-[var(--color-border)]">
						{#each filteredSpecies as sp}
							<tr class="hover:bg-[var(--color-border)]/20 transition-colors">
								<td class="py-3 px-4 font-bold text-xs">
									<div class="flex items-center gap-2">
										<span class="w-2.5 h-2.5 rounded-full {sp.isActive === 1 ? 'bg-emerald-500' : 'bg-stone-300 dark:bg-stone-600'}"></span>
										{sp.name}
									</div>
								</td>
								<td class="py-3 px-4">
									<span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider {sp.category === 'dangerous_game' ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300' : sp.category === 'rare_game' ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'}">
										{sp.category.replace('_', ' ')}
									</span>
								</td>
								<td class="py-3 px-4 font-mono font-semibold">
									{formatZar(sp.defaultPriceCents || 0)}
								</td>
								<td class="py-3 px-4">
									{#if sp.isActive === 1}
										<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
											Active
										</span>
									{:else}
										<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-400">
											Archived
										</span>
									{/if}
								</td>
								<td class="py-3 px-4 text-right">
									<div class="flex items-center justify-end gap-2">
										<button
											type="button"
											onclick={() => {
												editSpeciesId = sp.id;
												editSpeciesName = sp.name;
												editSpeciesCategory = sp.category;
												editSpeciesPriceZar = ((sp.defaultPriceCents || 0) / 100).toString();
												editingSpecies = sp;
											}}
											class="btn btn-xs btn-ghost text-[var(--color-primary)] font-bold flex items-center gap-1"
										>
											<Edit3 class="w-3 h-3" /> Edit
										</button>
										<form method="POST" action="?/toggleSpeciesStatus" use:enhance>
											<input type="hidden" name="id" value={sp.id} />
											<button
												type="submit"
												class="btn btn-xs rounded-lg font-bold {sp.isActive === 1 ? 'btn-ghost text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40' : 'btn-outline text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'}"
											>
												{sp.isActive === 1 ? 'Deactivate' : 'Activate'}
											</button>
										</form>
									</div>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	{/if}

	<!-- ========================================================================= -->
	<!-- DATASET 2: VISIT CATEGORIES & CALENDAR LEGEND MASTER -->
	<!-- ========================================================================= -->
	{#if activeDataset === 'categories'}
		<div class="bg-[var(--color-bg-surface)] border border-[var(--color-border)] rounded-2xl p-6 shadow-sm space-y-4">
			<div class="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
				<div>
					<div class="flex items-center gap-2">
						<Palette class="w-5 h-5 text-purple-600" />
						<h2 class="font-extrabold text-base sm:text-lg">Visit Categories & Calendar Legend Master ({filteredCategories.length})</h2>
					</div>
					<p class="text-xs text-[var(--color-text-secondary)] mt-0.5">
						Configures reservation categories, booking form purpose pickers, and visual color codes on the Field Operations calendar.
					</p>
				</div>
				<div class="flex flex-wrap items-center gap-2 w-full lg:w-auto">
					<div class="relative flex-1 sm:w-64 min-w-[160px]">
						<Search class="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]" />
						<input
							type="text"
							placeholder="Search categories..."
							bind:value={categorySearch}
							class="input input-bordered input-sm w-full pl-9 text-xs rounded-xl"
						/>
					</div>
					<button
						type="button"
						onclick={() => (showNewCategoryModal = true)}
						class="btn btn-sm bg-[var(--color-primary)] text-white border-0 rounded-xl text-xs font-bold"
					>
						<Plus class="w-3.5 h-3.5" /> Add Visit Category
					</button>
				</div>
			</div>

			<!-- Categories Table -->
			<div class="overflow-x-auto">
				<table class="w-full text-left text-xs">
					<thead>
						<tr class="border-b border-[var(--color-border)] text-[var(--color-text-secondary)] font-bold uppercase tracking-wider text-[10px]">
							<th class="py-3 px-4">Icon & Category Label</th>
							<th class="py-3 px-4">System Key</th>
							<th class="py-3 px-4">Calendar Color</th>
							<th class="py-3 px-4">Description & Guidance</th>
							<th class="py-3 px-4 text-right">Actions</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-[var(--color-border)]">
						{#each filteredCategories as cat}
							<tr class="hover:bg-[var(--color-border)]/20 transition-colors">
								<td class="py-3 px-4 font-bold text-xs">
									<div class="flex items-center gap-2">
										<span class="w-3 h-3 rounded-full shrink-0 border border-black/10 shadow-2xs" style="background-color: {cat.colorHex}"></span>
										<span class="px-2.5 py-1 rounded-full text-xs font-extrabold text-white flex items-center gap-1.5 shadow-2xs" style="background-color: {cat.colorHex}">
											<svelte:component this={getVisitIconComponent(cat.icon)} class="w-3.5 h-3.5 shrink-0" />
											<span>{cat.label}</span>
										</span>
									</div>
								</td>
								<td class="py-3 px-4 font-mono text-xs font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">
									{cat.key}
								</td>
								<td class="py-3 px-4">
									<span class="font-mono text-xs font-bold px-2 py-0.5 rounded bg-[var(--color-bg-base)] border border-[var(--color-border)]">
										{cat.colorHex}
									</span>
								</td>
								<td class="py-3 px-4 text-xs text-[var(--color-text-secondary)] max-w-md">
									{cat.description || 'Standard reserve excursion booking category.'}
								</td>
								<td class="py-3 px-4 text-right">
									<div class="flex items-center justify-end gap-1.5">
										<button
											type="button"
											onclick={() => {
												editCatId = cat.id;
												editCatKey = cat.key;
												editCatLabel = cat.label;
												editCatIcon = cat.icon || 'Compass';
												editCatColorHex = cat.colorHex;
												editCatDescription = cat.description || '';
												editingCategory = cat;
											}}
											class="btn btn-xs btn-ghost text-[var(--color-primary)] font-bold flex items-center gap-1"
											title="Edit {cat.label}"
										>
											<Edit3 class="w-3 h-3" /> Edit
										</button>
										<button
											type="button"
											onclick={() => (deletingCategory = cat)}
											class="btn btn-xs btn-ghost text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 font-bold flex items-center gap-1"
											title="Delete {cat.label}"
										>
											<Trash2 class="w-3 h-3" /> Delete
										</button>
									</div>
								</td>
							</tr>
						{:else}
							<tr>
								<td colspan="5" class="py-8 text-center text-xs text-[var(--color-text-secondary)]">
									No visit categories match the search filter.
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	{/if}

	<!-- ========================================================================= -->
	<!-- DATASET 3: CADASTRAL LAND PORTIONS MASTER -->
	<!-- ========================================================================= -->
	{#if activeDataset === 'portions'}
		<div class="bg-[var(--color-bg-surface)] border border-[var(--color-border)] rounded-2xl p-6 shadow-sm space-y-4">
			<div class="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
				<div>
					<div class="flex items-center gap-2">
						<Landmark class="w-5 h-5 text-amber-600" />
						<h2 class="font-extrabold text-base sm:text-lg">Cadastral Land Portions Master ({data.landPortions.length})</h2>
					</div>
					<p class="text-xs text-[var(--color-text-secondary)] mt-0.5">
						Official cadastral survey registers governing reserve surface areas, title portion names, and share-weighted voting percentages.
					</p>
				</div>
				<div class="flex flex-wrap items-center gap-2 w-full lg:w-auto">
					<div class="relative flex-1 sm:w-64 min-w-[160px]">
						<Search class="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]" />
						<input
							type="text"
							placeholder="Search portions..."
							bind:value={portionsSearch}
							class="input input-bordered input-sm w-full pl-9 text-xs rounded-xl"
						/>
					</div>
					<button
						type="button"
						onclick={() => (showNewPortionModal = true)}
						class="btn btn-sm bg-[var(--color-primary)] text-white border-0 rounded-xl text-xs font-bold"
					>
						<Plus class="w-3.5 h-3.5" /> Assign Portion
					</button>
				</div>
			</div>

			<!-- Invariant Gauge -->
			<div class="p-3 bg-[var(--color-bg-base)] rounded-xl border border-[var(--color-border)] flex items-center justify-between text-xs">
				<div class="flex items-center gap-2">
					<ShieldCheck class="w-4 h-4 text-emerald-600" />
					<span class="font-bold">Total Reserve Allocation:</span>
					<span class="font-mono font-bold text-emerald-600">{data.stats.totalBps} / 10,000 bps ({data.stats.totalBps / 100}%)</span>
				</div>
				<div class="font-mono text-[11px] text-[var(--color-text-secondary)] font-bold">
					Total Surveyed Area: {data.stats.totalHectares.toLocaleString()} ha
				</div>
			</div>

			<!-- Portions Table -->
			<div class="overflow-x-auto">
				<table class="w-full text-left text-xs">
					<thead>
						<tr class="border-b border-[var(--color-border)] text-[var(--color-text-secondary)] font-bold uppercase tracking-wider text-[10px]">
							<th class="py-3 px-4">Portion Cadastral Name</th>
							<th class="py-3 px-4">Registered Owner</th>
							<th class="py-3 px-4">Surface (Ha)</th>
							<th class="py-3 px-4">Share (BPS)</th>
							<th class="py-3 px-4">Voting Weight</th>
							<th class="py-3 px-4">Status</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-[var(--color-border)]">
						{#each filteredPortions as p}
							<tr class="hover:bg-[var(--color-border)]/20 transition-colors">
								<td class="py-3 px-4 font-bold text-xs">{p.portionName}</td>
								<td class="py-3 px-4 text-xs">
									{#if p.owner}
										<span class="font-semibold">{p.owner.name}</span>
										<span class="text-[10px] text-[var(--color-text-secondary)] block font-mono">{p.owner.email}</span>
									{:else}
										<span class="text-[var(--color-text-secondary)] italic">Unassigned Reserve Land</span>
									{/if}
								</td>
								<td class="py-3 px-4 font-mono font-semibold">{p.hectares.toLocaleString()} ha</td>
								<td class="py-3 px-4 font-mono font-bold text-[var(--color-primary)]">
									{p.ownershipBps} bps ({(p.ownershipBps / 100).toFixed(2)}%)
								</td>
								<td class="py-3 px-4 font-mono font-bold">{p.voteAllocationBps} bps</td>
								<td class="py-3 px-4">
									<span class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase {p.status === 'active' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-stone-100 text-stone-700'}">
										{p.status}
									</span>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	{/if}

	<!-- ========================================================================= -->
	<!-- DATASET 4: ANNUAL QUOTA BASELINES & PLO LANDOWNER ALLOCATIONS -->
	<!-- ========================================================================= -->
	{#if activeDataset === 'quotas'}
		<div class="bg-[var(--color-bg-surface)] border border-[var(--color-border)] rounded-2xl p-6 shadow-sm space-y-6">
			<!-- Header & Title -->
			<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
				<div>
					<div class="flex items-center gap-2">
						<Crosshair class="w-5 h-5 text-rose-600" />
						<h2 class="font-extrabold text-base sm:text-lg">
							Annual Quota Baselines & Allocations ({filteredQuotas.length} of {data.quotas.length})
						</h2>
					</div>
					<p class="text-xs text-[var(--color-text-secondary)] mt-1 max-w-3xl leading-relaxed">
						Authoritative ecological off-take limits and replacement tariffs. Quotas are structured into <strong>LEDET</strong> (provincial authority) and <strong>PLO</strong> (private landowner) categories, with <strong>Hunting</strong> and <strong>Selling</strong> subcategories. PLO quotas are proportionally distributed across reserve landowners based on their registered cadastral ownership percentages.
					</p>
				</div>
				<button
					type="button"
					onclick={() => {
						newQuotaSpecies = data.masterSpecies?.[0]?.name || 'Kudu';
						newQuotaYear = parseInt(quotaYearFilter === 'all' ? '2026' : quotaYearFilter, 10);
						showNewQuotaModal = true;
					}}
					class="btn btn-sm bg-[var(--color-primary)] text-white border-0 rounded-xl text-xs font-bold shrink-0 self-start sm:self-auto flex items-center gap-1.5"
				>
					<Plus class="w-3.5 h-3.5" />
					Add Quota Baseline
				</button>
			</div>

			<!-- Filter Bar: Year, Category, Subcategory & Species -->
			<div class="bg-[var(--color-bg-base)]/70 border border-[var(--color-border)] rounded-2xl p-4 space-y-3">
				<div class="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-[var(--color-border)]/60 text-xs">
					<div class="flex items-center gap-2 font-bold text-[var(--color-text-primary)]">
						<Filter class="w-3.5 h-3.5 text-[var(--color-primary)]" />
						<span>Quota Register Filters</span>
					</div>
					{#if quotaYearFilter !== '2026' || quotaCategoryFilter !== 'all' || quotaSubcategoryFilter !== 'all' || quotaSpeciesSearch}
						<button
							type="button"
							onclick={() => {
								quotaYearFilter = '2026';
								quotaCategoryFilter = 'all';
								quotaSubcategoryFilter = 'all';
								quotaSpeciesSearch = '';
							}}
							class="text-[11px] font-bold text-rose-600 hover:underline flex items-center gap-1"
						>
							<RotateCcw class="w-3 h-3" /> Reset to Current Year
						</button>
					{/if}
				</div>

				<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
					<!-- 1. Year Filter -->
					<div class="space-y-1">
						<label class="text-[11px] font-bold text-[var(--color-text-secondary)] flex items-center gap-1">
							<Calendar class="w-3 h-3" /> Season Year
						</label>
						<select
							bind:value={quotaYearFilter}
							class="select select-bordered select-sm w-full text-xs font-bold bg-[var(--color-bg-surface)]"
						>
							<option value="2026">2026 (Current Season)</option>
							<option value="all">All Years (Include Past Quotas)</option>
							{#each availableQuotaYears as yr}
								{#if yr !== 2026}
									<option value={yr.toString()}>{yr} (Historical)</option>
								{/if}
							{/each}
						</select>
					</div>

					<!-- 2. Category Filter (LEDET vs PLO) -->
					<div class="space-y-1">
						<label class="text-[11px] font-bold text-[var(--color-text-secondary)] flex items-center gap-1">
							<ShieldCheck class="w-3 h-3" /> Quota Category
						</label>
						<select
							bind:value={quotaCategoryFilter}
							class="select select-bordered select-sm w-full text-xs font-bold bg-[var(--color-bg-surface)]"
						>
							<option value="all">All Categories (LEDET & PLO)</option>
							<option value="plo">PLO (Private Land Owners)</option>
							<option value="ledet">LEDET (State / Authority)</option>
						</select>
					</div>

					<!-- 3. Subcategory Filter (Hunting vs Selling) -->
					<div class="space-y-1">
						<label class="text-[11px] font-bold text-[var(--color-text-secondary)] flex items-center gap-1">
							<Tag class="w-3 h-3" /> Purpose Subcategory
						</label>
						<select
							bind:value={quotaSubcategoryFilter}
							class="select select-bordered select-sm w-full text-xs font-bold bg-[var(--color-bg-surface)]"
						>
							<option value="all">All Subcategories (Hunting & Selling)</option>
							<option value="hunting">Hunting (Consumptive Off-Take)</option>
							<option value="selling">Selling (Live Capture & Sale)</option>
						</select>
					</div>

					<!-- 4. Species Search Query -->
					<div class="space-y-1">
						<label class="text-[11px] font-bold text-[var(--color-text-secondary)] flex items-center gap-1">
							<Search class="w-3 h-3" /> Wildlife Species
						</label>
						<div class="relative">
							<input
								type="text"
								placeholder="Search species..."
								bind:value={quotaSpeciesSearch}
								class="input input-bordered input-sm w-full text-xs pr-7 bg-[var(--color-bg-surface)]"
							/>
							{#if quotaSpeciesSearch}
								<button
									type="button"
									onclick={() => (quotaSpeciesSearch = '')}
									class="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
								>
									<X class="w-3.5 h-3.5" />
								</button>
							{/if}
						</div>
					</div>
				</div>
			</div>

			<!-- Quotas Summary Cards -->
			<div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
				<div class="p-3.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-base)]/50">
					<div class="text-[11px] font-bold uppercase text-[var(--color-text-secondary)]">Total Quota in View</div>
					<div class="text-xl font-extrabold text-[var(--color-text-primary)] mt-0.5 font-mono">
						{filteredQuotas.reduce((sum: number, q: any) => sum + (q.totalAllocation || 0), 0)} Head
					</div>
					<div class="text-[11px] text-[var(--color-text-secondary)]">{filteredQuotas.length} entries matching</div>
				</div>

				<div class="p-3.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-base)]/50">
					<div class="text-[11px] font-bold uppercase text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
						<Crosshair class="w-3 h-3" /> PLO Hunting
					</div>
					<div class="text-xl font-extrabold text-emerald-700 dark:text-emerald-400 mt-0.5 font-mono">
						{filteredQuotas.filter((q: any) => q.category === 'plo' && q.subcategory === 'hunting').reduce((sum: number, q: any) => sum + (q.totalAllocation || 0), 0)} Head
					</div>
					<div class="text-[11px] text-[var(--color-text-secondary)]">Member recreational & biltong</div>
				</div>

				<div class="p-3.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-base)]/50">
					<div class="text-[11px] font-bold uppercase text-blue-700 dark:text-blue-400 flex items-center gap-1">
						<ShoppingCart class="w-3 h-3" /> PLO Selling
					</div>
					<div class="text-xl font-extrabold text-blue-700 dark:text-blue-400 mt-0.5 font-mono">
						{filteredQuotas.filter((q: any) => q.category === 'plo' && q.subcategory === 'selling').reduce((sum: number, q: any) => sum + (q.totalAllocation || 0), 0)} Head
					</div>
					<div class="text-[11px] text-[var(--color-text-secondary)]">Live game capture & auctions</div>
				</div>

				<div class="p-3.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-base)]/50">
					<div class="text-[11px] font-bold uppercase text-amber-700 dark:text-amber-400 flex items-center gap-1">
						<ShieldCheck class="w-3 h-3" /> LEDET Total
					</div>
					<div class="text-xl font-extrabold text-amber-700 dark:text-amber-400 mt-0.5 font-mono">
						{filteredQuotas.filter((q: any) => q.category === 'ledet').reduce((sum: number, q: any) => sum + (q.totalAllocation || 0), 0)} Head
					</div>
					<div class="text-[11px] text-[var(--color-text-secondary)]">State departmental quota</div>
				</div>
			</div>

			<!-- Quotas Table -->
			<div class="overflow-x-auto">
				<table class="w-full text-left text-xs">
					<thead>
						<tr class="border-b border-[var(--color-border)] text-[var(--color-text-secondary)] font-bold uppercase tracking-wider text-[10px]">
							<th class="py-3 px-4">Species & Notes</th>
							<th class="py-3 px-4">Season Year</th>
							<th class="py-3 px-4">Category</th>
							<th class="py-3 px-4">Subcategory</th>
							<th class="py-3 px-4">Total Reserve Head</th>
							<th class="py-3 px-4">Unit Tariff (ZAR)</th>
							<th class="py-3 px-4">PLO Landowner Distribution</th>
							<th class="py-3 px-4 text-right">Actions</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-[var(--color-border)]">
						{#if filteredQuotas.length === 0}
							<tr>
								<td colspan="8" class="py-8 text-center text-stone-500 italic text-xs">
									No quota baseline entries match the active filters.
								</td>
							</tr>
						{:else}
							{#each filteredQuotas as q}
								{@const isPlo = q.category === 'plo'}
								{@const allocatedSum = (q.allocations || []).reduce((sum: number, a: any) => sum + (a.allocatedHead || 0), 0)}
								{@const isFullyAllocated = allocatedSum === q.totalAllocation}
								<tr class="hover:bg-[var(--color-border)]/20 transition-colors">
									<!-- Species & Notes -->
									<td class="py-3 px-4">
										<div class="font-extrabold text-xs text-[var(--color-text-primary)]">{q.species}</div>
										{#if q.notes}
											<div class="text-[11px] text-[var(--color-text-secondary)] max-w-xs truncate">{q.notes}</div>
										{/if}
									</td>

									<!-- Year Badge -->
									<td class="py-3 px-4">
										{#if q.year === 2026}
											<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-mono">
												2026 Current
											</span>
										{:else}
											<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300 font-mono flex items-center gap-1 w-fit">
												<History class="w-3 h-3" /> {q.year} Past
											</span>
										{/if}
									</td>

									<!-- Category -->
									<td class="py-3 px-4">
										{#if q.category === 'plo'}
											<span class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 inline-flex items-center gap-1">
												<Users class="w-3 h-3" /> PLO
											</span>
										{:else}
											<span class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 inline-flex items-center gap-1">
												<ShieldCheck class="w-3 h-3" /> LEDET
											</span>
										{/if}
									</td>

									<!-- Subcategory -->
									<td class="py-3 px-4">
										{#if q.subcategory === 'hunting'}
											<span class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 inline-flex items-center gap-1">
												<Crosshair class="w-3 h-3" /> Hunting
											</span>
										{:else}
											<span class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 inline-flex items-center gap-1">
												<ShoppingCart class="w-3 h-3" /> Selling
											</span>
										{/if}
									</td>

									<!-- Total Allocation Head -->
									<td class="py-3 px-4 font-mono font-black text-sm text-[var(--color-text-primary)]">
										{q.totalAllocation} <span class="text-[10px] font-normal text-[var(--color-text-secondary)]">head</span>
									</td>

									<!-- Unit Tariff (ZAR) -->
									<td class="py-3 px-4 font-mono font-bold text-emerald-700 dark:text-emerald-400">
										{formatZar(q.unitPriceCents)}
									</td>

									<!-- PLO Landowner Allocation Status -->
									<td class="py-3 px-4">
										{#if isPlo}
											<div class="flex items-center gap-2">
												<div>
													<div class="text-[11px] font-mono font-bold {isFullyAllocated ? 'text-emerald-600' : 'text-amber-600'}">
														{allocatedSum} / {q.totalAllocation} Head ({q.allocations?.length || 0} PLOs)
													</div>
													<div class="w-24 bg-[var(--color-border)]/50 h-1.5 rounded-full overflow-hidden mt-0.5">
														<div
															class="h-full {isFullyAllocated ? 'bg-emerald-500' : 'bg-amber-500'} rounded-full"
															style="width: {q.totalAllocation > 0 ? Math.min(100, (allocatedSum / q.totalAllocation) * 100) : 0}%"
														></div>
													</div>
												</div>
												<button
													type="button"
													onclick={() => openAllocationModal(q)}
													class="btn btn-xs bg-purple-700 hover:bg-purple-800 text-white border-0 font-bold px-2 py-1 rounded-lg shadow-2xs flex items-center gap-1 shrink-0"
													title="Manage Landowner Proportional Allocations"
												>
													<Sparkles class="w-3 h-3 text-purple-200" />
													<span>Distribute</span>
												</button>
											</div>
										{:else}
											<span class="text-[11px] text-[var(--color-text-secondary)] italic">
												Provincial State Quota (Not PLO split)
											</span>
										{/if}
									</td>

									<!-- Actions -->
									<td class="py-3 px-4 text-right">
										<div class="flex items-center justify-end gap-1">
											<button
												type="button"
												onclick={() => {
													editQuotaId = q.id;
													editQuotaSpecies = q.species;
													editQuotaYear = q.year;
													editQuotaCategory = q.category;
													editQuotaSubcategory = q.subcategory;
													editQuotaAllocation = q.totalAllocation;
													editQuotaUnitPriceZar = (q.unitPriceCents / 100).toString();
													editQuotaNotes = q.notes || '';
													editingQuota = q;
												}}
												class="btn btn-xs btn-ghost text-[var(--color-primary)] font-bold flex items-center gap-1"
												title="Edit Quota Settings"
											>
												<Edit3 class="w-3 h-3" /> Adjust
											</button>
											<form method="POST" action="?/deleteQuota" use:enhance>
												<input type="hidden" name="id" value={q.id} />
												<button
													type="submit"
													onclick={(e) => { if (!confirm(`Delete ${q.species} quota for ${q.year}?`)) e.preventDefault(); }}
													class="btn btn-xs btn-ghost text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 font-bold p-1 rounded-lg"
													title="Delete Quota"
												>
													<Trash2 class="w-3 h-3" />
												</button>
											</form>
										</div>
									</td>
								</tr>
							{/each}
						{/if}
					</tbody>
				</table>
			</div>
		</div>
	{/if}

	<!-- ========================================================================= -->
	<!-- DATASET 5: FINANCIAL CHART OF ACCOUNTS -->
	<!-- ========================================================================= -->
	<!-- ========================================================================= -->
	<!-- DATASET 5: FINANCIAL CHART OF ACCOUNTS -->
	<!-- ========================================================================= -->
	{#if activeDataset === 'finance'}
		<div class="bg-[var(--color-bg-surface)] border border-[var(--color-border)] rounded-2xl p-6 shadow-sm space-y-4">
			<div class="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
				<div>
					<div class="flex items-center gap-2">
						<CreditCard class="w-5 h-5 text-blue-600" />
						<h2 class="font-extrabold text-base sm:text-lg">Reserve Financial Chart of Accounts Master ({filteredFinancialAccounts.length})</h2>
					</div>
					<p class="text-xs text-[var(--color-text-secondary)] mt-0.5">
						Fiduciary account definitions, reserve trust funds, and transaction classification taxonomies recognized by reserve constitutional audits.
					</p>
				</div>
				<div class="flex flex-wrap items-center gap-2 w-full lg:w-auto">
					<div class="relative flex-1 sm:w-64 min-w-[160px]">
						<Search class="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]" />
						<input
							type="text"
							placeholder="Search accounts..."
							bind:value={financeSearch}
							class="input input-bordered input-sm w-full pl-9 text-xs rounded-xl"
						/>
					</div>
				</div>
			</div>

			<!-- Financial Accounts Table -->
			<div class="overflow-x-auto">
				<table class="w-full text-left text-xs">
					<thead>
						<tr class="border-b border-[var(--color-border)] text-[var(--color-text-secondary)] font-bold uppercase tracking-wider text-[10px]">
							<th class="py-3 px-4">Account Name</th>
							<th class="py-3 px-4">Account Code</th>
							<th class="py-3 px-4">Account Category</th>
							<th class="py-3 px-4">Purpose & Governance Scope</th>
							<th class="py-3 px-4 text-right">Audit Status</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-[var(--color-border)]">
						{#each filteredFinancialAccounts as acc}
							<tr class="hover:bg-[var(--color-border)]/20 transition-colors">
								<td class="py-3 px-4 font-bold text-xs text-[var(--color-text-primary)]">
									{acc.name}
								</td>
								<td class="py-3 px-4 font-mono font-bold text-xs text-[var(--color-text-secondary)]">
									{acc.code}
								</td>
								<td class="py-3 px-4">
									<span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider {acc.badgeColor === 'blue' ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300' : acc.badgeColor === 'purple' ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300' : acc.badgeColor === 'rose' ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'}">
										{acc.category}
									</span>
								</td>
								<td class="py-3 px-4 text-xs text-[var(--color-text-secondary)] max-w-md">
									{acc.description}
								</td>
								<td class="py-3 px-4 text-right">
									<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
										{acc.status}
									</span>
								</td>
							</tr>
						{:else}
							<tr>
								<td colspan="5" class="py-8 text-center text-xs text-[var(--color-text-secondary)]">
									No financial accounts match the search filter.
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	{/if}
</div>

<!-- ========================================================================= -->
<!-- MODALS FOR MASTER DATA SUITE -->
<!-- ========================================================================= -->

<!-- 1. Add Species Modal -->
{#if showNewSpeciesModal}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
		<div class="bg-[var(--color-bg-surface)] border border-[var(--color-border)] rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
			<div class="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
				<div>
					<h3 class="font-extrabold text-base">Add Wildlife Species Master Entry</h3>
					<p class="text-xs text-[var(--color-text-secondary)]">Adds an official species to census dropdowns, quota models, and hunt logs.</p>
				</div>
				<button type="button" onclick={() => (showNewSpeciesModal = false)} class="p-1 rounded-lg hover:bg-[var(--color-border)]/40"><X class="w-4 h-4" /></button>
			</div>
			<form method="POST" action="?/createSpecies" use:enhance={() => async ({ update }) => { showNewSpeciesModal = false; await update(); }} class="space-y-4">
				<div class="space-y-1">
					<label class="text-xs font-bold text-[var(--color-text-secondary)]">Species Common Name</label>
					<input type="text" name="name" required placeholder="e.g. Roan Antelope, Sable, Tsessebe" bind:value={newSpeciesName} class="input input-bordered input-sm w-full text-xs font-bold" />
				</div>
				<div class="grid grid-cols-2 gap-3">
					<div class="space-y-1">
						<label class="text-xs font-bold text-[var(--color-text-secondary)]">Ecological Category</label>
						<select name="category" bind:value={newSpeciesCategory} class="select select-bordered select-sm w-full text-xs">
							<option value="plains_game">Plains Game</option>
							<option value="rare_game">Rare / Premium Game</option>
							<option value="dangerous_game">Dangerous Game (Big 5)</option>
							<option value="other">Other / Specialized</option>
						</select>
					</div>
					<div class="space-y-1">
						<label class="text-xs font-bold text-[var(--color-text-secondary)]">Baseline Tariff (ZAR)</label>
						<input type="number" step="100" min="0" name="defaultPriceZar" required placeholder="0.00" bind:value={newSpeciesPriceZar} class="input input-bordered input-sm w-full text-xs font-mono font-bold" />
					</div>
				</div>
				<div class="flex justify-end gap-2 pt-2 border-t border-[var(--color-border)]">
					<button type="button" onclick={() => (showNewSpeciesModal = false)} class="px-4 py-2 rounded-xl text-xs font-bold border border-[var(--color-border)]">Cancel</button>
					<button type="submit" class="btn bg-[var(--color-primary)] text-white border-0 text-xs font-bold px-4 py-2 rounded-xl">Create Master Species</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- 2. Edit Species Modal -->
{#if editingSpecies}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
		<div class="bg-[var(--color-bg-surface)] border border-[var(--color-border)] rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
			<div class="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
				<div>
					<h3 class="font-extrabold text-base">Edit Species: {editingSpecies.name}</h3>
					<p class="text-xs text-[var(--color-text-secondary)]">Modify common name, ecological classification, or baseline price.</p>
				</div>
				<button type="button" onclick={() => (editingSpecies = null)} class="p-1 rounded-lg hover:bg-[var(--color-border)]/40"><X class="w-4 h-4" /></button>
			</div>
			<form method="POST" action="?/updateSpecies" use:enhance={() => async ({ update }) => { editingSpecies = null; await update(); }} class="space-y-4">
				<input type="hidden" name="id" value={editSpeciesId} />
				<div class="space-y-1">
					<label class="text-xs font-bold text-[var(--color-text-secondary)]">Species Common Name</label>
					<input type="text" name="name" required bind:value={editSpeciesName} class="input input-bordered input-sm w-full text-xs font-bold" />
				</div>
				<div class="grid grid-cols-2 gap-3">
					<div class="space-y-1">
						<label class="text-xs font-bold text-[var(--color-text-secondary)]">Ecological Category</label>
						<select name="category" bind:value={editSpeciesCategory} class="select select-bordered select-sm w-full text-xs">
							<option value="plains_game">Plains Game</option>
							<option value="rare_game">Rare / Premium Game</option>
							<option value="dangerous_game">Dangerous Game</option>
							<option value="other">Other</option>
						</select>
					</div>
					<div class="space-y-1">
						<label class="text-xs font-bold text-[var(--color-text-secondary)]">Baseline Tariff (ZAR)</label>
						<input type="number" step="100" min="0" name="defaultPriceZar" required bind:value={editSpeciesPriceZar} class="input input-bordered input-sm w-full text-xs font-mono font-bold" />
					</div>
				</div>
				<div class="flex justify-end gap-2 pt-2 border-t border-[var(--color-border)]">
					<button type="button" onclick={() => (editingSpecies = null)} class="px-4 py-2 rounded-xl text-xs font-bold border border-[var(--color-border)]">Cancel</button>
					<button type="submit" class="btn bg-[var(--color-primary)] text-white border-0 text-xs font-bold px-4 py-2 rounded-xl">Save Changes</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- 3. Add Visit Category Modal -->
{#if showNewCategoryModal}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
		<div class="bg-[var(--color-bg-surface)] border border-[var(--color-border)] rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
			<div class="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
				<div>
					<h3 class="font-extrabold text-base">Add Visit Category Master</h3>
					<p class="text-xs text-[var(--color-text-secondary)]">Adds a new booking category with custom icon & color styling to the calendar.</p>
				</div>
				<button type="button" onclick={() => (showNewCategoryModal = false)} class="p-1 rounded-lg hover:bg-[var(--color-border)]/40"><X class="w-4 h-4" /></button>
			</div>
			<form method="POST" action="?/createVisitCategory" use:enhance={() => async ({ update }) => { showNewCategoryModal = false; await update(); }} class="space-y-4">
				<div class="grid grid-cols-2 gap-3">
					<div class="space-y-1">
						<label class="text-xs font-bold text-[var(--color-text-secondary)]">Unique Key Identifier</label>
						<input type="text" name="key" required placeholder="e.g. anti_poaching_patrol" bind:value={newCatKey} class="input input-bordered input-sm w-full text-xs font-mono font-bold" />
					</div>
					<div class="space-y-1">
						<label class="text-xs font-bold text-[var(--color-text-secondary)]">Display Label</label>
						<input type="text" name="label" required placeholder="e.g. APU Patrol" bind:value={newCatLabel} class="input input-bordered input-sm w-full text-xs font-bold" />
					</div>
				</div>

				<!-- 10-Lucide Icon Picker -->
				<div class="space-y-1.5">
					<label class="text-xs font-bold text-[var(--color-text-secondary)]">Visit Reason Icon (10 Options)</label>
					<div class="grid grid-cols-2 sm:grid-cols-5 gap-2 p-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-base)]/40 max-h-52 overflow-y-auto">
						{#each VISIT_ICON_OPTIONS as opt}
							{@const IconComp = opt.icon}
							<button
								type="button"
								onclick={() => (newCatIcon = opt.name)}
								class="flex flex-col items-center justify-center p-2 rounded-xl border transition-all text-center gap-1.5 {newCatIcon === opt.name
									? 'border-purple-600 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 ring-2 ring-purple-600/30'
									: 'border-[var(--color-border)] bg-[var(--color-bg-surface)] hover:bg-[var(--color-border)]/20 text-[var(--color-text-primary)]'}"
								title={opt.description}
							>
								<svelte:component this={IconComp} class="w-5 h-5 shrink-0" />
								<span class="text-[10px] font-bold leading-tight truncate w-full">{opt.name}</span>
							</button>
						{/each}
					</div>
					<input type="hidden" name="icon" value={newCatIcon} />
				</div>

				<div class="space-y-1">
					<label class="text-xs font-bold text-[var(--color-text-secondary)]">Color Scheme</label>
					<div class="flex items-center gap-3">
						<input type="color" bind:value={newCatColorHex} class="w-10 h-10 rounded-xl cursor-pointer border border-[var(--color-border)] bg-transparent p-0.5" />
						<input type="text" name="colorHex" required placeholder="#10b981" bind:value={newCatColorHex} class="input input-bordered input-sm flex-1 text-xs font-mono font-bold" />
						<div class="px-3 py-1.5 rounded-full text-xs font-bold text-white shadow-xs flex items-center gap-1.5" style="background-color: {newCatColorHex}">
							<svelte:component this={getVisitIconComponent(newCatIcon)} class="w-3.5 h-3.5" />
							<span>{newCatLabel || 'Preview'}</span>
						</div>
					</div>
				</div>
				<div class="space-y-1">
					<label class="text-xs font-bold text-[var(--color-text-secondary)]">Description / Booking Notes</label>
					<textarea name="description" rows="2" placeholder="Brief guidance shown to members when selecting this visit type..." bind:value={newCatDescription} class="textarea textarea-bordered textarea-sm w-full text-xs"></textarea>
				</div>
				<div class="flex justify-end gap-2 pt-2 border-t border-[var(--color-border)]">
					<button type="button" onclick={() => (showNewCategoryModal = false)} class="px-4 py-2 rounded-xl text-xs font-bold border border-[var(--color-border)]">Cancel</button>
					<button type="submit" class="btn bg-purple-700 hover:bg-purple-800 text-white border-0 text-xs font-bold px-4 py-2 rounded-xl">Create Visit Category</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- 4. Edit Visit Category Modal -->
{#if editingCategory}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
		<div class="bg-[var(--color-bg-surface)] border border-[var(--color-border)] rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
			<div class="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
				<div>
					<h3 class="font-extrabold text-base">Edit Visit Category: {editCatKey}</h3>
					<p class="text-xs text-[var(--color-text-secondary)]">Adjust label, icon, hex color scheme, and booking guidelines.</p>
				</div>
				<button type="button" onclick={() => (editingCategory = null)} class="p-1 rounded-lg hover:bg-[var(--color-border)]/40"><X class="w-4 h-4" /></button>
			</div>
			<form method="POST" action="?/updateVisitCategory" use:enhance={() => async ({ update }) => { editingCategory = null; await update(); }} class="space-y-4">
				<input type="hidden" name="id" value={editCatId} />
				<div class="space-y-1">
					<label class="text-xs font-bold text-[var(--color-text-secondary)]">Display Label</label>
					<input type="text" name="label" required bind:value={editCatLabel} class="input input-bordered input-sm w-full text-xs font-bold" />
				</div>

				<!-- 10-Lucide Icon Picker -->
				<div class="space-y-1.5">
					<label class="text-xs font-bold text-[var(--color-text-secondary)]">Visit Reason Icon (10 Options)</label>
					<div class="grid grid-cols-2 sm:grid-cols-5 gap-2 p-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-base)]/40 max-h-52 overflow-y-auto">
						{#each VISIT_ICON_OPTIONS as opt}
							{@const IconComp = opt.icon}
							<button
								type="button"
								onclick={() => (editCatIcon = opt.name)}
								class="flex flex-col items-center justify-center p-2 rounded-xl border transition-all text-center gap-1.5 {editCatIcon === opt.name
									? 'border-purple-600 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 ring-2 ring-purple-600/30'
									: 'border-[var(--color-border)] bg-[var(--color-bg-surface)] hover:bg-[var(--color-border)]/20 text-[var(--color-text-primary)]'}"
								title={opt.description}
							>
								<svelte:component this={IconComp} class="w-5 h-5 shrink-0" />
								<span class="text-[10px] font-bold leading-tight truncate w-full">{opt.name}</span>
							</button>
						{/each}
					</div>
					<input type="hidden" name="icon" value={editCatIcon} />
				</div>

				<div class="space-y-1">
					<label class="text-xs font-bold text-[var(--color-text-secondary)]">Color Scheme</label>
					<div class="flex items-center gap-3">
						<input type="color" bind:value={editCatColorHex} class="w-10 h-10 rounded-xl cursor-pointer border border-[var(--color-border)] bg-transparent p-0.5" />
						<input type="text" name="colorHex" required bind:value={editCatColorHex} class="input input-bordered input-sm flex-1 text-xs font-mono font-bold" />
						<div class="px-3 py-1.5 rounded-full text-xs font-bold text-white shadow-xs flex items-center gap-1.5" style="background-color: {editCatColorHex}">
							<svelte:component this={getVisitIconComponent(editCatIcon)} class="w-3.5 h-3.5" />
							<span>{editCatLabel || 'Preview'}</span>
						</div>
					</div>
				</div>
				<div class="space-y-1">
					<label class="text-xs font-bold text-[var(--color-text-secondary)]">Description / Booking Notes</label>
					<textarea name="description" rows="2" bind:value={editCatDescription} class="textarea textarea-bordered textarea-sm w-full text-xs"></textarea>
				</div>
				<div class="flex justify-end gap-2 pt-2 border-t border-[var(--color-border)]">
					<button type="button" onclick={() => (editingCategory = null)} class="px-4 py-2 rounded-xl text-xs font-bold border border-[var(--color-border)]">Cancel</button>
					<button type="submit" class="btn bg-purple-700 hover:bg-purple-800 text-white border-0 text-xs font-bold px-4 py-2 rounded-xl">Save Category Settings</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- 4.1 Delete Visit Category Confirmation Modal -->
{#if deletingCategory}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
		<div class="bg-[var(--color-bg-surface)] border border-[var(--color-border)] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
			<div class="flex items-center gap-3 text-rose-600">
				<div class="p-2.5 rounded-xl bg-rose-100 dark:bg-rose-950/50">
					<Trash2 class="w-6 h-6" />
				</div>
				<div>
					<h3 class="font-extrabold text-base text-[var(--color-text-primary)]">Delete Visit Category</h3>
					<p class="text-xs text-[var(--color-text-secondary)]">Master Data Register</p>
				</div>
			</div>

			<p class="text-xs text-[var(--color-text-secondary)] leading-relaxed">
				Are you sure you want to permanently remove the visit category <strong class="text-[var(--color-text-primary)]">"{deletingCategory.label}"</strong> (<code class="font-mono text-[11px]">{deletingCategory.key}</code>) from the master register?
			</p>

			<div class="flex items-center gap-2.5 p-3 rounded-xl bg-[var(--color-bg-base)] border border-[var(--color-border)] text-xs">
				<svelte:component this={getVisitIconComponent(deletingCategory.icon)} class="w-4 h-4 shrink-0 text-purple-600" />
				<span class="font-bold">{deletingCategory.label}</span>
				<span class="text-[var(--color-text-secondary)]">({deletingCategory.key})</span>
			</div>

			<form method="POST" action="?/deleteVisitCategory" use:enhance={() => async ({ update }) => { deletingCategory = null; await update(); }} class="flex justify-end gap-2 pt-2 border-t border-[var(--color-border)]">
				<input type="hidden" name="id" value={deletingCategory.id} />
				<button type="button" onclick={() => (deletingCategory = null)} class="px-4 py-2 rounded-xl text-xs font-bold border border-[var(--color-border)] hover:bg-[var(--color-border)]/30">
					Cancel
				</button>
				<button type="submit" class="btn bg-rose-600 hover:bg-rose-700 text-white border-0 text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5">
					<Trash2 class="w-3.5 h-3.5" /> Confirm Delete
				</button>
			</form>
		</div>
	</div>
{/if}

<!-- 5. Assign Portion Modal -->
{#if showNewPortionModal}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
		<div class="bg-[var(--color-bg-surface)] border border-[var(--color-border)] rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
			<div class="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
				<h3 class="font-extrabold text-base">Assign Cadastral Land Portion</h3>
				<button type="button" onclick={() => (showNewPortionModal = false)} class="p-1 rounded-lg hover:bg-[var(--color-border)]/40"><X class="w-4 h-4" /></button>
			</div>
			<form method="POST" action="?/createPortion" use:enhance={() => async ({ update }) => { showNewPortionModal = false; await update(); }} class="space-y-4">
				<div class="space-y-1">
					<label class="text-xs font-bold text-[var(--color-text-secondary)]">Registered Landowner</label>
					<select name="userId" bind:value={portionUserId} class="select select-bordered select-sm w-full text-xs">
						<option value="">Unassigned Reserve Land</option>
						{#each data.users as u}
							<option value={u.id}>{u.name} ({u.email})</option>
						{/each}
					</select>
				</div>
				<div class="space-y-1">
					<label class="text-xs font-bold text-[var(--color-text-secondary)]">Portion Cadastral Name</label>
					<input type="text" name="portionName" required placeholder="e.g. Portion 6 (Buffelsvlei)" bind:value={portionName} class="input input-bordered input-sm w-full text-xs" />
				</div>
				<div class="grid grid-cols-2 gap-3">
					<div class="space-y-1">
						<label class="text-xs font-bold text-[var(--color-text-secondary)]">Surface (Hectares)</label>
						<input type="number" step="0.1" name="hectares" required placeholder="1500" bind:value={portionHectares} class="input input-bordered input-sm w-full text-xs font-mono" />
					</div>
					<div class="space-y-1">
						<label class="text-xs font-bold text-[var(--color-text-secondary)]">Basis Points (100 bps = 1%)</label>
						<input type="number" name="ownershipBps" required placeholder="1500" bind:value={portionBps} class="input input-bordered input-sm w-full text-xs font-mono font-bold" />
					</div>
				</div>
				<div class="flex justify-end gap-2 pt-2 border-t border-[var(--color-border)]">
					<button type="button" onclick={() => (showNewPortionModal = false)} class="px-4 py-2 rounded-xl text-xs font-bold border border-[var(--color-border)]">Cancel</button>
					<button type="submit" class="btn bg-[var(--color-secondary)] text-white border-0 text-xs font-bold px-4 py-2 rounded-xl">Assign Portion</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- 6. Add Quota Baseline Modal -->
{#if showNewQuotaModal}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
		<div class="bg-[var(--color-bg-surface)] border border-[var(--color-border)] rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
			<div class="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
				<div>
					<h3 class="font-extrabold text-base">Add Annual Quota Baseline</h3>
					<p class="text-xs text-[var(--color-text-secondary)]">Create a new carrying limit entry for LEDET or PLO operations.</p>
				</div>
				<button type="button" onclick={() => (showNewQuotaModal = false)} class="p-1 rounded-lg hover:bg-[var(--color-border)]/40"><X class="w-4 h-4" /></button>
			</div>
			<form method="POST" action="?/createQuota" use:enhance={() => async ({ update }) => { showNewQuotaModal = false; await update(); }} class="space-y-4">
				<div class="grid grid-cols-2 gap-3">
					<div class="space-y-1">
						<label class="text-xs font-bold text-[var(--color-text-secondary)]">Season Year</label>
						<input type="number" name="year" required bind:value={newQuotaYear} class="input input-bordered input-sm w-full text-xs font-mono font-bold" />
					</div>
					<div class="space-y-1">
						<label class="text-xs font-bold text-[var(--color-text-secondary)]">Wildlife Species</label>
						<select name="species" bind:value={newQuotaSpecies} class="select select-bordered select-sm w-full text-xs font-bold">
							{#each data.masterSpecies || [] as sp}
								<option value={sp.name}>{sp.name} ({sp.category})</option>
							{/each}
						</select>
					</div>
				</div>

				<!-- Quota Category & Purpose Subcategory -->
				<div class="grid grid-cols-2 gap-3">
					<div class="space-y-1">
						<label class="text-xs font-bold text-[var(--color-text-secondary)]">Quota Category</label>
						<div class="grid grid-cols-2 gap-1 p-1 bg-[var(--color-bg-base)] rounded-xl border border-[var(--color-border)]">
							<button
								type="button"
								onclick={() => (newQuotaCategory = 'plo')}
								class="py-1 text-xs font-bold rounded-lg transition-all {newQuotaCategory === 'plo' ? 'bg-purple-700 text-white shadow-xs' : 'text-stone-600'}"
							>
								PLO
							</button>
							<button
								type="button"
								onclick={() => (newQuotaCategory = 'ledet')}
								class="py-1 text-xs font-bold rounded-lg transition-all {newQuotaCategory === 'ledet' ? 'bg-amber-600 text-white shadow-xs' : 'text-stone-600'}"
							>
								LEDET
							</button>
						</div>
						<input type="hidden" name="category" value={newQuotaCategory} />
					</div>

					<div class="space-y-1">
						<label class="text-xs font-bold text-[var(--color-text-secondary)]">Subcategory</label>
						<div class="grid grid-cols-2 gap-1 p-1 bg-[var(--color-bg-base)] rounded-xl border border-[var(--color-border)]">
							<button
								type="button"
								onclick={() => (newQuotaSubcategory = 'hunting')}
								class="py-1 text-xs font-bold rounded-lg transition-all {newQuotaSubcategory === 'hunting' ? 'bg-emerald-700 text-white shadow-xs' : 'text-stone-600'}"
							>
								Hunting
							</button>
							<button
								type="button"
								onclick={() => (newQuotaSubcategory = 'selling')}
								class="py-1 text-xs font-bold rounded-lg transition-all {newQuotaSubcategory === 'selling' ? 'bg-blue-700 text-white shadow-xs' : 'text-stone-600'}"
							>
								Selling
							</button>
						</div>
						<input type="hidden" name="subcategory" value={newQuotaSubcategory} />
					</div>
				</div>

				<div class="grid grid-cols-2 gap-3">
					<div class="space-y-1">
						<label class="text-xs font-bold text-[var(--color-text-secondary)]">Total Head Allocation</label>
						<input type="number" min="1" name="totalAllocation" required bind:value={newQuotaAllocation} class="input input-bordered input-sm w-full text-xs font-mono font-bold" />
					</div>
					<div class="space-y-1">
						<label class="text-xs font-bold text-[var(--color-text-secondary)]">Unit Tariff (ZAR)</label>
						<input type="number" step="100" min="0" name="unitPriceZar" required bind:value={newQuotaUnitPriceZar} class="input input-bordered input-sm w-full text-xs font-mono font-bold" />
					</div>
				</div>

				<div class="space-y-1">
					<label class="text-xs font-bold text-[var(--color-text-secondary)]">Ecological / Regulatory Notes</label>
					<textarea name="notes" rows="2" placeholder="Carrying capacity rationale or provincial permit reference..." bind:value={newQuotaNotes} class="textarea textarea-bordered textarea-sm w-full text-xs"></textarea>
				</div>

				<div class="flex justify-end gap-2 pt-2 border-t border-[var(--color-border)]">
					<button type="button" onclick={() => (showNewQuotaModal = false)} class="px-4 py-2 rounded-xl text-xs font-bold border border-[var(--color-border)]">Cancel</button>
					<button type="submit" class="btn bg-rose-700 hover:bg-rose-800 text-white border-0 text-xs font-bold px-4 py-2 rounded-xl">Create Quota Entry</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- 7. Edit Quota Modal -->
{#if editingQuota}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
		<div class="bg-[var(--color-bg-surface)] border border-[var(--color-border)] rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
			<div class="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
				<div>
					<h3 class="font-extrabold text-base">Adjust Quota: {editQuotaSpecies} ({editQuotaYear})</h3>
					<p class="text-xs text-[var(--color-text-secondary)]">Modify carrying limit head allocation, purpose subcategory, or tariff.</p>
				</div>
				<button type="button" onclick={() => (editingQuota = null)} class="p-1 rounded-lg hover:bg-[var(--color-border)]/40"><X class="w-4 h-4" /></button>
			</div>
			<form method="POST" action="?/updateQuota" use:enhance={() => async ({ update }) => { editingQuota = null; await update(); }} class="space-y-4">
				<input type="hidden" name="id" value={editQuotaId} />
				<input type="hidden" name="species" value={editQuotaSpecies} />

				<div class="grid grid-cols-2 gap-3">
					<div class="space-y-1">
						<label class="text-xs font-bold text-[var(--color-text-secondary)]">Season Year</label>
						<input type="number" name="year" required bind:value={editQuotaYear} class="input input-bordered input-sm w-full text-xs font-mono font-bold" />
					</div>
					<div class="space-y-1">
						<label class="text-xs font-bold text-[var(--color-text-secondary)]">Category</label>
						<select name="category" bind:value={editQuotaCategory} class="select select-bordered select-sm w-full text-xs font-bold">
							<option value="plo">PLO (Private Land Owners)</option>
							<option value="ledet">LEDET (State Authority)</option>
						</select>
					</div>
				</div>

				<div class="grid grid-cols-2 gap-3">
					<div class="space-y-1">
						<label class="text-xs font-bold text-[var(--color-text-secondary)]">Subcategory</label>
						<select name="subcategory" bind:value={editQuotaSubcategory} class="select select-bordered select-sm w-full text-xs font-bold">
							<option value="hunting">Hunting (Consumptive)</option>
							<option value="selling">Selling (Live Capture)</option>
						</select>
					</div>
					<div class="space-y-1">
						<label class="text-xs font-bold text-[var(--color-text-secondary)]">Unit Tariff (ZAR)</label>
						<input type="number" step="100" min="0" name="unitPriceZar" required bind:value={editQuotaUnitPriceZar} class="input input-bordered input-sm w-full text-xs font-mono font-bold" />
					</div>
				</div>

				<div class="space-y-1">
					<label class="text-xs font-bold text-[var(--color-text-secondary)]">Total Reserve Head Allocation</label>
					<input type="number" name="totalAllocation" min="0" required bind:value={editQuotaAllocation} class="input input-bordered input-sm w-full text-xs font-mono font-bold" />
				</div>

				<div class="space-y-1">
					<label class="text-xs font-bold text-[var(--color-text-secondary)]">Ecological Notes</label>
					<textarea name="notes" rows="2" bind:value={editQuotaNotes} class="textarea textarea-bordered textarea-sm w-full text-xs"></textarea>
				</div>

				<div class="flex justify-end gap-2 pt-2 border-t border-[var(--color-border)]">
					<button type="button" onclick={() => (editingQuota = null)} class="px-4 py-2 rounded-xl text-xs font-bold border border-[var(--color-border)]">Cancel</button>
					<button type="submit" class="btn bg-[var(--color-primary)] text-white border-0 text-xs font-bold px-4 py-2 rounded-xl">Save Quota Settings</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- 8. PLO Landowner Allocation Distribution Modal -->
{#if allocatingQuota}
	{@const totalHead = allocatingQuota.totalAllocation || 0}
	{@const remaining = totalHead - totalAllocatedHead}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
		<div class="bg-[var(--color-bg-surface)] border border-[var(--color-border)] rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5">
			<!-- Header -->
			<div class="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
				<div>
					<div class="flex items-center gap-2">
						<Users class="w-5 h-5 text-purple-600" />
						<h3 class="font-extrabold text-base sm:text-lg">
							Distribute Quota to Landowners
						</h3>
					</div>
					<p class="text-xs text-[var(--color-text-secondary)] mt-0.5">
						<strong>{allocatingQuota.species}</strong> ({allocatingQuota.year} {allocatingQuota.subcategory.toUpperCase()}) — Total Quota: <strong>{totalHead} Head</strong>
					</p>
				</div>
				<button type="button" onclick={() => (allocatingQuota = null)} class="p-1 rounded-lg hover:bg-[var(--color-border)]/40"><X class="w-4 h-4" /></button>
			</div>

			<!-- Status & Auto-Distribute Toolbar -->
			<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-base)]">
				<div class="flex items-center gap-3">
					<div class="text-xs">
						<span class="text-[var(--color-text-secondary)]">Total Available:</span>
						<span class="font-mono font-bold text-[var(--color-text-primary)] ml-1">{totalHead} Head</span>
					</div>
					<div class="text-xs">
						<span class="text-[var(--color-text-secondary)]">Assigned:</span>
						<span class="font-mono font-bold {totalAllocatedHead === totalHead ? 'text-emerald-600' : 'text-amber-600'} ml-1">{totalAllocatedHead} Head</span>
					</div>
					<div class="text-xs">
						<span class="text-[var(--color-text-secondary)]">Unassigned:</span>
						<span class="font-mono font-bold {remaining === 0 ? 'text-emerald-600' : remaining < 0 ? 'text-rose-600' : 'text-amber-600'} ml-1">{remaining} Head</span>
					</div>
				</div>

				<button
					type="button"
					onclick={autoDistributeProportional}
					class="btn btn-xs bg-purple-700 hover:bg-purple-800 text-white border-0 font-bold px-3 py-1.5 rounded-lg shadow-2xs flex items-center gap-1.5 self-start sm:self-auto"
					title="Automatically distribute heads by registered ownership %"
				>
					<Sparkles class="w-3.5 h-3.5 text-purple-200" />
					<span>Auto-Calculate Proportional Split</span>
				</button>
			</div>

			{#if remaining !== 0}
				<div class="p-3 rounded-xl border {remaining < 0 ? 'border-rose-200 bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200' : 'border-amber-200 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200'} flex items-center gap-2 text-xs">
					<AlertCircle class="w-4 h-4 shrink-0" />
					<span>
						{#if remaining < 0}
							Allocated head count ({totalAllocatedHead}) exceeds total quota ({totalHead}) by {Math.abs(remaining)} head. Please adjust.
						{:else}
							{remaining} head remain unassigned. You can adjust the manual counts below or click Auto-Calculate.
						{/if}
					</span>
				</div>
			{/if}

			<!-- Landowner Roster & Allocations Form -->
			<form
				method="POST"
				action="?/saveQuotaAllocations"
				use:enhance={() => async ({ update }) => {
					allocatingQuota = null;
					await update();
				}}
				class="space-y-4"
			>
				<input type="hidden" name="quotaId" value={allocatingQuota.id} />

				<div class="overflow-x-auto border border-[var(--color-border)] rounded-xl max-h-72 overflow-y-auto">
					<table class="w-full text-left text-xs">
						<thead class="bg-[var(--color-bg-base)] sticky top-0 z-10 border-b border-[var(--color-border)]">
							<tr class="text-[var(--color-text-secondary)] font-bold uppercase tracking-wider text-[10px]">
								<th class="py-2.5 px-3">Landowner</th>
								<th class="py-2.5 px-3">Cadastral Portion(s)</th>
								<th class="py-2.5 px-3 text-right">Ownership %</th>
								<th class="py-2.5 px-3 text-right">Proportional Target</th>
								<th class="py-2.5 px-3 text-right">Allocated Head</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-[var(--color-border)]">
							{#each data.ploLandowners || [] as landowner}
								{@const targetHeads = ((landowner.ownershipPercentage / 100) * totalHead).toFixed(1)}
								<tr class="hover:bg-[var(--color-border)]/20 transition-colors">
									<!-- Landowner Name & Email -->
									<td class="py-2.5 px-3">
										<div class="font-bold text-xs">{landowner.name}</div>
										<div class="text-[10px] text-[var(--color-text-secondary)] font-mono">{landowner.email}</div>
									</td>

									<!-- Cadastral Portions -->
									<td class="py-2.5 px-3">
										{#if landowner.portions.length > 0}
											<div class="text-xs text-[var(--color-text-secondary)]">
												{landowner.portions.join(', ')}
											</div>
										{:else}
											<span class="text-stone-400 italic">No assigned portion</span>
										{/if}
									</td>

									<!-- Ownership % -->
									<td class="py-2.5 px-3 text-right font-mono font-bold text-purple-700 dark:text-purple-400">
										{landowner.ownershipPercentage.toFixed(2)}%
										<span class="text-[10px] text-[var(--color-text-secondary)] block font-normal">({landowner.ownershipBps} bps)</span>
									</td>

									<!-- Proportional Target -->
									<td class="py-2.5 px-3 text-right font-mono text-stone-500">
										{targetHeads} head
									</td>

									<!-- Manual Allocation Input -->
									<td class="py-2.5 px-3 text-right">
										<input
											type="number"
											min="0"
											max={totalHead}
											name={`allocation_${landowner.id}`}
											bind:value={allocationValues[landowner.id]}
											class="input input-bordered input-xs w-20 text-right font-mono font-black text-xs"
										/>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>

				<!-- Actions -->
				<div class="flex items-center justify-between pt-3 border-t border-[var(--color-border)]">
					<div class="text-xs text-[var(--color-text-secondary)]">
						Saving updates each landowner's personal quota in Field Operations.
					</div>
					<div class="flex items-center gap-2">
						<button
							type="button"
							onclick={() => (allocatingQuota = null)}
							class="px-4 py-2 rounded-xl text-xs font-bold border border-[var(--color-border)]"
						>
							Cancel
						</button>
						<button
							type="submit"
							class="btn bg-purple-700 hover:bg-purple-800 text-white border-0 text-xs font-bold px-5 py-2 rounded-xl shadow-xs"
						>
							Commit PLO Allocations
						</button>
					</div>
				</div>
			</form>
		</div>
	</div>
{/if}
