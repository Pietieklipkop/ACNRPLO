<script lang="ts">
	import {
		Landmark,
		Calendar,
		Vote,
		Crosshair,
		Binoculars,
		FileText,
		ArrowRight,
		Shield,
		Clock,
		CreditCard,
		Bot,
		Compass,
		Users,
		Settings,
		ChevronRight,
		CheckCircle2
	} from 'lucide-svelte';

	let { data } = $props();

	const isSecretary = $derived(data.user?.roles?.includes('secretary'));
	const isExecutive = $derived(data.user?.roles?.includes('executive'));
	const canAccessFinanceLedger = $derived(isSecretary || isExecutive);

	function formatZar(cents: number | null | undefined): string {
		if (cents === null || cents === undefined) return 'R 0.00';
		const isNegative = cents < 0;
		const abs = Math.abs(cents);
		return `${isNegative ? '-' : ''}R ${(abs / 100).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
	}
</script>

<svelte:head>
	<title>Reserve Cockpit — ACNRPLO</title>
</svelte:head>

<div class="space-y-6 pb-16">
	<!-- Member Identity Hero Banner -->
	<div
		class="relative overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-4 sm:p-8 shadow-sm"
	>
		<div class="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
			<div>
				<div class="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--color-primary)]">
					<Shield class="w-4 h-4" />
					Atherstone Collaborative Nature Reserve
				</div>
				<h1 class="text-2xl sm:text-3xl font-extrabold tracking-tight mt-1">
					Welcome back, {data.user?.name}
				</h1>
				<p class="text-xs sm:text-sm text-[var(--color-text-secondary)] mt-1 max-w-2xl">
					Reserve Cockpit: centralized single pane of glass for private landowner operations, governance, wildlife off-take, and constitutional compliance.
				</p>

				<div class="flex flex-wrap gap-1.5 mt-3">
					{#each data.user?.roles || [] as role}
						<span
							class="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider {role === 'secretary'
								? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
								: role === 'executive'
									? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
									: role === 'main_plo'
										? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
										: 'bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300'}"
						>
							{role.replace('_', ' ')}
						</span>
					{/each}
				</div>
			</div>

			<!-- Member Quick Badges Strip -->
			<div class="flex flex-wrap md:flex-col gap-2.5 shrink-0">
				<!-- Land Share Metric Pill -->
				<div class="bg-[var(--color-bg-base)] border border-[var(--color-border)] px-4 py-2.5 rounded-xl flex items-center justify-between gap-4 shadow-sm w-full sm:w-auto min-w-0 sm:min-w-[200px]">
					<div>
						<div class="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">
							Registered Land Share
						</div>
						<div class="text-xl font-black text-[var(--color-primary)] tabular-nums">
							{data.user?.ownershipPercentage?.toFixed(2) || '0.00'}%
						</div>
					</div>
					<div class="w-9 h-9 rounded-lg bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center">
						<Landmark class="w-5 h-5" />
					</div>
				</div>

				<!-- Executive Reserve Liquidity Glance (if authorized) -->
				{#if canAccessFinanceLedger && data.executiveLiquidityCents !== null}
					<a
						href={isSecretary ? "/admin?tab=finance" : "/finance"}
						class="bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 px-4 py-2 rounded-xl flex items-center justify-between gap-4 transition-colors w-full sm:w-auto min-w-0 sm:min-w-[200px]"
						title="View Reserve Financial Ledger"
					>
						<div>
							<div class="text-[10px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300">
								Reserve Capital & Liquidity
							</div>
							<div class="text-base font-extrabold text-amber-900 dark:text-amber-200 tabular-nums">
								{formatZar(data.executiveLiquidityCents)}
							</div>
						</div>
						<CreditCard class="w-4 h-4 text-amber-700 dark:text-amber-300" />
					</a>
				{/if}
			</div>
		</div>

		<!-- Ecological, Vault & AI Quick Tickers -->
		<div class="mt-6 pt-4 border-t border-[var(--color-border)] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
			<!-- Latest Census Badge -->
			{#if data.latestCensus}
				<a
					href="/operations?tab=census"
					class="p-2.5 rounded-xl bg-[var(--color-bg-base)] border border-[var(--color-border)] hover:border-[var(--color-primary)]/40 flex items-center gap-2.5 transition-all text-xs"
				>
					<div class="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 flex items-center justify-center shrink-0">
						<Binoculars class="w-4 h-4" />
					</div>
					<div class="truncate">
						<div class="font-bold text-[var(--color-text-primary)] truncate">
							Census: {data.latestCensus.count} {data.latestCensus.species}
						</div>
						<div class="text-[10px] text-[var(--color-text-secondary)]">
							{data.latestCensus.date} via {data.latestCensus.method.replace('_', ' ')}
						</div>
					</div>
				</a>
			{/if}

			<!-- Latest Document Badge -->
			{#if data.latestDocument}
				<a
					href="/documents"
					class="p-2.5 rounded-xl bg-[var(--color-bg-base)] border border-[var(--color-border)] hover:border-[var(--color-primary)]/40 flex items-center gap-2.5 transition-all text-xs"
				>
					<div class="w-7 h-7 rounded-lg bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 flex items-center justify-center shrink-0">
						<FileText class="w-4 h-4" />
					</div>
					<div class="truncate">
						<div class="font-bold text-[var(--color-text-primary)] truncate">
							Doc Vault: {data.latestDocument.title}
						</div>
						<div class="text-[10px] text-[var(--color-text-secondary)] uppercase">
							{data.latestDocument.category}
						</div>
					</div>
				</a>
			{/if}

			<!-- Constitution AI Assistant Badge -->
			<a
				href="/constitution/ai"
				class="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 hover:bg-purple-500/20 flex items-center gap-2.5 transition-all text-xs sm:col-span-2 lg:col-span-1"
			>
				<div class="w-7 h-7 rounded-lg bg-purple-600 text-white flex items-center justify-center shrink-0">
					<Bot class="w-4 h-4" />
				</div>
				<div class="truncate">
					<div class="font-bold text-purple-900 dark:text-purple-200">
						Constitution AI Assistant
					</div>
					<div class="text-[10px] text-purple-700 dark:text-purple-300">
						Ask binding questions on reserve bylaws
					</div>
				</div>
			</a>
		</div>
	</div>

	<!-- 4 Primary Member Gateway Cards -->
	<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
		<!-- Overview: Reserve Cockpit -->
		<div class="bg-[var(--color-bg-surface)] p-5 rounded-2xl border-2 border-[var(--color-primary)] shadow-sm space-y-2 relative overflow-hidden">
			<div class="flex items-center justify-between">
				<span class="text-xs font-bold uppercase tracking-wider text-[var(--color-primary)]">Overview</span>
				<div class="w-7 h-7 rounded-lg bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center">
					<Landmark class="w-4 h-4" />
				</div>
			</div>
			<div>
				<div class="text-base font-extrabold text-[var(--color-text-primary)]">Reserve Cockpit</div>
				<p class="text-xs text-[var(--color-text-secondary)] mt-0.5">
					High-level cadastral overview, quota metrics, and live alerts.
				</p>
			</div>
			<div class="pt-2">
				<span class="inline-flex items-center gap-1 text-xs font-bold text-[var(--color-primary)]">
					Active View
				</span>
			</div>
		</div>

		<!-- Operations: Field Operations -->
		<a
			href="/operations"
			class="bg-[var(--color-bg-surface)] p-5 rounded-2xl border border-[var(--color-border)] hover:border-[var(--color-primary)]/50 hover:shadow-md transition-all space-y-2 group block"
		>
			<div class="flex items-center justify-between">
				<span class="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">Operations</span>
				<div class="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 flex items-center justify-center group-hover:scale-110 transition-transform">
					<Compass class="w-4 h-4" />
				</div>
			</div>
			<div>
				<div class="text-base font-extrabold text-[var(--color-text-primary)] group-hover:text-[var(--color-primary)] transition-colors">Field Operations</div>
				<p class="text-xs text-[var(--color-text-secondary)] mt-0.5">
					Shared calendar visits, quota hunting ledger & wildlife census.
				</p>
			</div>
			<div class="pt-2 flex items-center justify-between text-xs font-bold text-emerald-700 dark:text-emerald-400">
				<span>Open Hub</span>
				<ArrowRight class="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
			</div>
		</a>

		<!-- Governance -->
		<a
			href="/governance"
			class="bg-[var(--color-bg-surface)] p-5 rounded-2xl border border-[var(--color-border)] hover:border-[var(--color-primary)]/50 hover:shadow-md transition-all space-y-2 group block"
		>
			<div class="flex items-center justify-between">
				<span class="text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400">Governance</span>
				<div class="w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 flex items-center justify-center group-hover:scale-110 transition-transform">
					<Vote class="w-4 h-4" />
				</div>
			</div>
			<div>
				<div class="text-base font-extrabold text-[var(--color-text-primary)] group-hover:text-[var(--color-primary)] transition-colors">Governance</div>
				<p class="text-xs text-[var(--color-text-secondary)] mt-0.5">
					Active voting ballots, cadastral portions roster & family associates.
				</p>
			</div>
			<div class="pt-2 flex items-center justify-between text-xs font-bold text-indigo-700 dark:text-indigo-400">
				<span>Open Ballots</span>
				<ArrowRight class="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
			</div>
		</a>

		<!-- Document Vault -->
		<a
			href="/documents"
			class="bg-[var(--color-bg-surface)] p-5 rounded-2xl border border-[var(--color-border)] hover:border-[var(--color-primary)]/50 hover:shadow-md transition-all space-y-2 group block"
		>
			<div class="flex items-center justify-between">
				<span class="text-xs font-bold uppercase tracking-wider text-sky-700 dark:text-sky-400">Vault & Records</span>
				<div class="w-7 h-7 rounded-lg bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 flex items-center justify-center group-hover:scale-110 transition-transform">
					<FileText class="w-4 h-4" />
				</div>
			</div>
			<div>
				<div class="text-base font-extrabold text-[var(--color-text-primary)] group-hover:text-[var(--color-primary)] transition-colors">Document Vault</div>
				<p class="text-xs text-[var(--color-text-secondary)] mt-0.5">
					Legal titles, AGM resolutions, constitution drafts & ecological permits.
				</p>
			</div>
			<div class="pt-2 flex items-center justify-between text-xs font-bold text-sky-700 dark:text-sky-400">
				<span>Browse Vault</span>
				<ArrowRight class="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
			</div>
		</a>
	</div>

	<!-- 4 Core Metric Glance Cards -->
	<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
		<!-- Land Portions -->
		<div class="bg-[var(--color-bg-surface)] p-5 rounded-2xl border border-[var(--color-border)] shadow-sm space-y-1">
			<div class="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">
				<span>Surveyed Portions</span>
				<Landmark class="w-4 h-4 text-[var(--color-secondary)]" />
			</div>
			<div class="text-2xl font-black text-[var(--color-text-primary)] tabular-nums">
				{data.portions.length}
			</div>
			<div class="text-[11px] text-[var(--color-text-secondary)]">
				Total: {data.stats?.totalHectares?.toLocaleString('en-ZA') || 0} hectares ({data.stats?.totalPercentage?.toFixed(2) || '0.00'}%)
			</div>
		</div>

		<!-- Personal Quota Balance -->
		<div class="bg-[var(--color-bg-surface)] p-5 rounded-2xl border border-[var(--color-border)] shadow-sm space-y-1">
			<div class="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">
				<span>Hunting Quota Balance</span>
				<Crosshair class="w-4 h-4 text-emerald-600" />
			</div>
			<div class="text-2xl font-black text-emerald-600 tabular-nums">
				{data.quotaSummary.totalRemaining} Head
			</div>
			<div class="text-[11px] text-[var(--color-text-secondary)]">
				Allocated: {data.quotaSummary.totalAllocated} | Hunted: {data.quotaSummary.totalHunted}
			</div>
		</div>

		<!-- Active Decisions -->
		<div class="bg-[var(--color-bg-surface)] p-5 rounded-2xl border border-[var(--color-border)] shadow-sm space-y-1">
			<div class="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">
				<span>Active Decisions</span>
				<Vote class="w-4 h-4 text-[var(--color-primary)]" />
			</div>
			<div class="text-2xl font-black text-[var(--color-primary)] tabular-nums">
				{data.activePolls.length}
			</div>
			<div class="text-[11px] text-[var(--color-text-secondary)]">
				{data.activePolls.length === 1 ? '1 decision pending ballot' : `${data.activePolls.length} decisions pending ballot`}
			</div>
		</div>

		<!-- Next Scheduled Trips -->
		<div class="bg-[var(--color-bg-surface)] p-5 rounded-2xl border border-[var(--color-border)] shadow-sm space-y-1">
			<div class="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">
				<span>Upcoming Visits</span>
				<Calendar class="w-4 h-4 text-sky-600" />
			</div>
			<div class="text-2xl font-black text-sky-600 tabular-nums">
				{data.upcomingVisits.length}
			</div>
			<div class="text-[11px] text-[var(--color-text-secondary)]">
				Scheduled reserve visits by members
			</div>
		</div>
	</div>

	<!-- Main Two-Column Grid -->
	<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
		<!-- Left: Land Ownership Breakdown (2 Cols) -->
		<div class="lg:col-span-2 bg-[var(--color-bg-surface)] rounded-2xl border border-[var(--color-border)] shadow-sm p-6 space-y-4">
			<div class="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
				<div>
					<h2 class="text-base font-bold text-[var(--color-text-primary)] flex items-center gap-2">
						<Landmark class="w-4 h-4 text-[var(--color-secondary)]" />
						Reserve Ownership Roster
					</h2>
					<p class="text-xs text-[var(--color-text-secondary)]">
						All active surveyed portions, hectarage, and proportional vote weights.
					</p>
				</div>
				<div class="flex items-center gap-3">
					<a
						href="/governance?tab=portions"
						class="text-xs font-semibold text-[var(--color-primary)] hover:underline flex items-center gap-1"
					>
						Full Roster <ArrowRight class="w-3.5 h-3.5" />
					</a>
					{#if isSecretary}
						<a
							href="/admin?tab=members"
							class="text-xs font-semibold text-purple-700 dark:text-purple-400 hover:underline flex items-center gap-1"
							title="Secretary Console"
						>
							<Settings class="w-3 h-3" /> Admin Tools
						</a>
					{/if}
				</div>
			</div>

			<!-- Overall Reserve Invariant Bar -->
			<div class="space-y-1.5 bg-[var(--color-bg-base)] p-3 rounded-xl border border-[var(--color-border)]">
				<div class="flex justify-between text-xs">
					<span class="font-medium text-[var(--color-text-secondary)]">Total Allocated Capacity:</span>
					<span class="font-bold tabular-nums font-mono">{(data.stats?.totalPercentage ?? 0).toFixed(2)}% of 100.00% ({data.stats?.totalBps || 0} / 10,000 bps)</span>
				</div>
				<div class="w-full bg-[var(--color-border)]/50 h-2.5 rounded-full overflow-hidden">
					<div
						class="h-full bg-[var(--color-primary)] rounded-full transition-all"
						style="width: {Math.min(data.stats?.totalPercentage ?? 0, 100)}%"
					></div>
				</div>
			</div>

			<!-- Portions List -->
			<div class="divide-y divide-[var(--color-border)] max-h-72 overflow-y-auto">
				{#each data.portions as port}
					<div class="py-2.5 flex items-center justify-between text-sm hover:bg-[var(--color-border)]/10 px-2 rounded-lg transition-colors">
						<div>
							<div class="font-bold text-[var(--color-text-primary)] flex items-center gap-2">
								<span>{port.portionName}</span>
								{#if port.owner?.id === data.user?.id}
									<span class="px-1.5 py-0.2 rounded text-[10px] font-bold uppercase bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
										Your Portion
									</span>
								{/if}
							</div>
							<div class="text-xs text-[var(--color-text-secondary)]">
								{port.owner?.name || 'Unassigned'} • {port.hectares.toLocaleString('en-ZA')} ha
							</div>
						</div>
						<div class="text-right">
							<div class="font-bold text-[var(--color-secondary)] tabular-nums">
								{(port.ownershipBps / 100).toFixed(2)}%
							</div>
							<div class="text-[11px] font-mono text-[var(--color-text-secondary)] tabular-nums">
								{port.ownershipBps} bps
							</div>
						</div>
					</div>
				{:else}
					<div class="py-8 text-center text-xs text-[var(--color-text-secondary)]">
						No portions configured yet.
					</div>
				{/each}
			</div>
		</div>

		<!-- Right: Active Polls & Personal Quota Summary (1 Col) -->
		<div class="space-y-6">
			<!-- Active Decisions Card -->
			<div class="bg-[var(--color-bg-surface)] rounded-2xl border border-[var(--color-border)] shadow-sm p-6 space-y-4">
				<div class="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
					<h2 class="text-base font-bold text-[var(--color-text-primary)] flex items-center gap-2">
						<Vote class="w-4 h-4 text-[var(--color-primary)]" />
						Active Decisions
					</h2>
					<a
						href="/governance"
						class="text-xs font-semibold text-[var(--color-primary)] hover:underline flex items-center gap-1"
					>
						Vote <ArrowRight class="w-3.5 h-3.5" />
					</a>
				</div>

				<div class="divide-y divide-[var(--color-border)]">
					{#each data.activePolls as poll}
						<div class="py-3 space-y-1">
							<div class="flex items-center justify-between">
								<span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
									Open
								</span>
								{#if poll.closesAt}
									<span class="text-[11px] text-[var(--color-text-secondary)] flex items-center gap-1">
										<Clock class="w-3 h-3" />
										Closes {new Date(poll.closesAt).toLocaleDateString('en-ZA')}
									</span>
								{/if}
							</div>
							<div class="font-bold text-sm text-[var(--color-text-primary)]">{poll.title}</div>
							<div class="text-xs text-[var(--color-text-secondary)] line-clamp-2">
								{poll.description}
							</div>
						</div>
					{:else}
						<div class="py-6 text-center text-xs text-[var(--color-text-secondary)]">
							No open decisions at this time. All resolutions up to date.
						</div>
					{/each}
				</div>

				<a
					href="/governance"
					class="w-full py-2.5 rounded-xl border border-[var(--color-border)] text-xs font-bold text-center hover:bg-[var(--color-border)]/30 transition-colors block"
				>
					Open Decisions & Governance
				</a>
			</div>

			<!-- Personal Quota Ledger Quick Widget -->
			<div class="bg-[var(--color-bg-surface)] rounded-2xl border border-[var(--color-border)] shadow-sm p-6 space-y-4">
				<div class="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
					<h2 class="text-base font-bold text-[var(--color-text-primary)] flex items-center gap-2">
						<Crosshair class="w-4 h-4 text-emerald-600" />
						Your Hunting Quota
					</h2>
					<a
						href="/operations?tab=quotas"
						class="text-xs font-semibold text-[var(--color-primary)] hover:underline flex items-center gap-1"
					>
						Ledger <ArrowRight class="w-3.5 h-3.5" />
					</a>
				</div>

				{#if data.quotaSummary.allocations.length > 0}
					<div class="space-y-2">
						{#each data.quotaSummary.allocations.slice(0, 3) as alloc}
							{@const remaining = Math.max(0, alloc.allocatedHead - alloc.huntedHead)}
							<div class="flex items-center justify-between text-xs p-2 rounded-lg bg-[var(--color-bg-base)] border border-[var(--color-border)]">
								<div>
									<div class="font-bold text-[var(--color-text-primary)]">{alloc.quota?.species || 'Species'}</div>
									<div class="text-[10px] text-[var(--color-text-secondary)]">
										Allocated: {alloc.allocatedHead} | Hunted: {alloc.huntedHead}
									</div>
								</div>
								<div class="text-right">
									<span class="px-2 py-0.5 rounded-full text-xs font-extrabold {remaining > 0 ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-stone-200 text-stone-700'}">
										{remaining} left
									</span>
								</div>
							</div>
						{/each}
					</div>
				{:else}
					<div class="py-4 text-center text-xs text-[var(--color-text-secondary)]">
						No hunting quota allocations assigned yet for 2026.
					</div>
				{/if}

				<a
					href="/operations?tab=quotas"
					class="w-full py-2.5 rounded-xl border border-[var(--color-border)] text-xs font-bold text-center hover:bg-[var(--color-border)]/30 transition-colors block"
				>
					View Quotas & Trade Marketplace
				</a>
			</div>
		</div>
	</div>

	<!-- Bottom Section: Next Scheduled Visits on Reserve -->
	<div class="bg-[var(--color-bg-surface)] rounded-2xl border border-[var(--color-border)] shadow-sm p-6 space-y-4">
		<div class="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
			<div>
				<h2 class="text-base font-bold text-[var(--color-text-primary)] flex items-center gap-2">
					<Calendar class="w-4 h-4 text-[var(--color-primary)]" />
					Upcoming Reserve Visits
				</h2>
				<p class="text-xs text-[var(--color-text-secondary)]">
					Scheduled visits across private landowner portions to coordinate field access and reserve safety.
				</p>
			</div>
			<a
				href="/operations?tab=calendar"
				class="text-xs font-semibold text-[var(--color-primary)] hover:underline flex items-center gap-1"
			>
				Full Calendar <ArrowRight class="w-3.5 h-3.5" />
			</a>
		</div>

		<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
			{#each data.upcomingVisits as visit}
				<div class="p-3.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-base)] space-y-1.5">
					<div class="flex items-center justify-between text-xs">
						<span class="font-bold text-[var(--color-text-primary)] truncate">{visit.member?.name}</span>
						<span
							class="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider shrink-0 {visit.purpose ===
							'hunting'
								? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
								: visit.purpose === 'game_count'
									? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
									: visit.purpose === 'maintenance'
										? 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300'
										: 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300'}"
						>
							{visit.purpose.replace('_', ' ')}
						</span>
					</div>
					<div class="text-xs font-medium text-[var(--color-text-secondary)] flex items-center gap-1">
						<Calendar class="w-3.5 h-3.5" />
						{visit.startDate} → {visit.endDate}
					</div>
					{#if visit.notes}
						<div class="text-[11px] text-[var(--color-text-secondary)] italic truncate">
							"{visit.notes}"
						</div>
					{/if}
				</div>
			{:else}
				<div class="col-span-full py-6 text-center text-xs text-[var(--color-text-secondary)]">
					No upcoming visits scheduled. Click "Full Calendar" to record your upcoming field dates.
				</div>
			{/each}
		</div>
	</div>
</div>
