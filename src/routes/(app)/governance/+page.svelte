<script lang="ts">
	import {
		Vote,
		Landmark,
		Users,
		Clock,
		CheckCircle2,
		AlertCircle,
		Shield,
		Check,
		X,
		Minus,
		UserCheck,
		UserPlus,
		Trash2,
		ArrowRight,
		Plus,
		MessageCircle
	} from 'lucide-svelte';
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';

	let { data, form } = $props();

	// Reactive Active Tab derived from URL searchParams
	const activeTab = $derived.by<'polls' | 'portions' | 'associates'>(() => {
		const paramTab = page.url.searchParams.get('tab');
		if (data.isSecretary && (paramTab === 'portions' || paramTab === 'associates')) {
			return paramTab;
		}
		return 'polls';
	});

	function setTab(tab: 'polls' | 'portions' | 'associates') {
		if (!data.isSecretary && tab !== 'polls') return;
		const url = new URL(page.url);
		url.searchParams.set('tab', tab);
		goto(url, { replaceState: true, noScroll: true, keepFocus: true });
	}

	// Voting Modal State (for Main PLO / Delegate)
	let selectedPoll = $state<any | null>(null);
	let selectedChoice = $state<'agree' | 'disagree' | 'abstain'>('agree');
	let isSubmittingVote = $state(false);

	// Secretary Proxy Voting Modal State (WhatsApp / Out-of-band)
	let showProxyModal = $state(false);
	let proxyPoll = $state<any | null>(null);
	let proxyTargetUserId = $state('');
	let proxyChoice = $state<'agree' | 'disagree' | 'abstain'>('agree');
	let proxyChannel = $state('WhatsApp');
	let proxyNotes = $state('');
	let isSubmittingProxy = $state(false);

	// Secretary Create Decision Modal State
	let showCreateDecisionModal = $state(false);
	let newDecisionTitle = $state('');
	let newDecisionDescription = $state('');
	let newDecisionResolutionType = $state('simple');
	let newDecisionClosesAt = $state('');
	let isSubmittingDecision = $state(false);

	// Add Associate Modal State
	let showAddAssociateModal = $state(false);
	let newAssocName = $state('');
	let newAssocEmail = $state('');
	let newAssocUsername = $state('');
	let newAssocPhone = $state('');
	let newAssocRelationship = $state('family');
	let newAssocPassword = $state('');
	let newAssocSponsorId = $state('');
	let isSubmittingAssociate = $state(false);

	function openVoteModal(poll: any, choice: 'agree' | 'disagree' | 'abstain') {
		selectedPoll = poll;
		selectedChoice = choice;
	}

	function openProxyModal(poll: any) {
		proxyPoll = poll;
		proxyChoice = 'agree';
		proxyChannel = 'WhatsApp';
		proxyNotes = '';
		const votedMemberIds = new Set((poll.votes || []).map((v: any) => v.userId));
		const firstEligible = (data.mainPloMembers || []).find((m: any) => !votedMemberIds.has(m.id));
		proxyTargetUserId = firstEligible ? firstEligible.id : (data.mainPloMembers?.[0]?.id || '');
		showProxyModal = true;
	}

	function calculateTallies(poll: any) {
		const votes = poll?.votes ?? [];
		const totalWeight = votes.reduce((sum: number, v: any) => sum + v.weightBps, 0);
		const agreeWeight = votes
			.filter((v: any) => v.choice === 'agree')
			.reduce((sum: number, v: any) => sum + v.weightBps, 0);
		const disagreeWeight = votes
			.filter((v: any) => v.choice === 'disagree')
			.reduce((sum: number, v: any) => sum + v.weightBps, 0);
		const abstainWeight = votes
			.filter((v: any) => v.choice === 'abstain')
			.reduce((sum: number, v: any) => sum + v.weightBps, 0);

		const decisiveWeight = agreeWeight + disagreeWeight;
		const agreePct = decisiveWeight > 0 ? (agreeWeight / decisiveWeight) * 100 : 0;
		const turnoutPct = (totalWeight / 10000) * 100;
		const quorumMet = turnoutPct >= 50;
		const passed = quorumMet && (poll.resolutionType === 'special' ? agreePct >= 75 : agreePct > 50);

		return { totalWeight, agreeWeight, disagreeWeight, abstainWeight, agreePct, turnoutPct, quorumMet, passed };
	}
</script>

<svelte:head>
	<title>Decisions & Governance — ACNRPLO</title>
</svelte:head>

<div class="space-y-6">
	<!-- Section Title & Sub-Nav Header -->
	<div class="bg-[var(--color-bg-surface)] border border-[var(--color-border)] rounded-2xl p-4 sm:p-6 shadow-sm">
		<div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
			<div>
				{#if data.isSecretary}
					<div class="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--color-primary)]">
						<Vote class="w-4 h-4" />
						Reserve Democracy & Cadastral Registry
					</div>
					<h1 class="text-2xl sm:text-3xl font-extrabold tracking-tight mt-1">
						Decisions & Governance Hub
					</h1>
					<p class="text-xs sm:text-sm text-[var(--color-text-secondary)] mt-1 max-w-2xl">
						Share-weighted voting on reserve decisions, official cadastral land portion records, and proxy ballot administration.
					</p>
				{:else}
					<div class="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--color-primary)]">
						<Vote class="w-4 h-4" />
						Reserve Democracy
					</div>
					<h1 class="text-2xl sm:text-3xl font-extrabold tracking-tight mt-1">
						Decisions & Resolutions
					</h1>
					<p class="text-xs sm:text-sm text-[var(--color-text-secondary)] mt-1 max-w-2xl">
						Cast your share-weighted votes on official reserve decisions, infrastructure investments, and reserve resolutions.
					</p>
				{/if}
			</div>

			<div class="flex items-center gap-2 self-start md:self-auto flex-wrap">
				{#if data.isSecretary}
					<button
						type="button"
						onclick={() => (showCreateDecisionModal = true)}
						class="btn bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary)]/90 border-0 flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold shadow-xs"
					>
						<Plus class="w-4 h-4" />
						Create Decision
					</button>

					{#if activeTab === 'associates'}
						<button
							type="button"
							onclick={() => (showAddAssociateModal = true)}
							class="btn bg-stone-800 text-white hover:bg-stone-900 border-0 flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold shadow-xs"
						>
							<UserPlus class="w-4 h-4" />
							Add Associate Member
						</button>
					{/if}
				{/if}
			</div>
		</div>

		<!-- Segmented Pill Sub-Navigation Control (Secretary Only) -->
		{#if data.isSecretary}
			<div class="flex items-center gap-1.5 mt-6 pt-4 border-t border-[var(--color-border)] overflow-x-auto pb-1">
				<button
					type="button"
					onclick={() => setTab('polls')}
					class="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 {activeTab === 'polls'
						? 'bg-[var(--color-primary)] text-white shadow-sm'
						: 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-border)]/30'}"
				>
					<Vote class="w-4 h-4" />
					<span>Active Decisions ({data.openPolls.length} Open)</span>
				</button>

				<button
					type="button"
					onclick={() => setTab('portions')}
					class="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 {activeTab === 'portions'
						? 'bg-[var(--color-primary)] text-white shadow-sm'
						: 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-border)]/30'}"
				>
					<Landmark class="w-4 h-4" />
					<span>Land Portions Roster ({data.portions.length} Surveyed)</span>
				</button>

				<button
					type="button"
					onclick={() => setTab('associates')}
					class="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 {activeTab === 'associates'
						? 'bg-[var(--color-primary)] text-white shadow-sm'
						: 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-border)]/30'}"
				>
					<Users class="w-4 h-4" />
					<span>Family Associates ({data.associates.length} Linked)</span>
				</button>
			</div>
		{/if}
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
			<span>Action recorded and committed successfully.</span>
		</div>
	{/if}

	<!-- ========================================================================= -->
	<!-- TAB 1: DECISIONS & BALLOTS -->
	<!-- ========================================================================= -->
	{#if activeTab === 'polls'}
		<div class="space-y-6 animate-fadeIn">
			<!-- Voter Weight Banner -->
			{#if data.canVote}
				<div class="bg-[var(--color-bg-surface)] p-4 rounded-xl border border-[var(--color-border)] shadow-sm flex items-center justify-between">
					<div class="flex items-center gap-3">
						<div class="w-8 h-8 rounded-lg bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center">
							<Landmark class="w-4 h-4" />
						</div>
						<div>
							<div class="text-xs font-bold text-[var(--color-text-primary)]">
								Your Proportional Vote Weight: <span class="text-[var(--color-primary)] font-extrabold">{data.user.ownershipPercentage?.toFixed(2)}%</span>
							</div>
							<div class="text-[11px] text-[var(--color-text-secondary)]">
								{#if data.user.associateRelationship === 'delegate'}
									Voting on behalf of sponsoring Main PLO member (<span class="font-bold text-[var(--color-text-primary)]">{data.user.sponsorName || 'Main PLO'}</span>) — ({data.user.voteWeightBps} bps).
								{:else}
									Derived directly from your registered land portions ({data.user.voteWeightBps} bps).
								{/if}
							</div>
						</div>
					</div>
				</div>
			{:else}
				<div class="p-3.5 rounded-xl bg-stone-100 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-xs text-[var(--color-text-secondary)] flex items-center gap-2.5">
					<Shield class="w-4 h-4 shrink-0 text-stone-500" />
					{#if data.user.associateRelationship === 'family'}
						<span><strong>Family Member (View Only):</strong> You have view-only access to decisions and tallies. Only the Main PLO or their Authorised Delegate may cast ballots.</span>
					{:else if data.user.associateRelationship === 'co_owner'}
						<span><strong>Co-Owner (Calendar Booking):</strong> You hold calendar scheduling rights for this portion. Only the Main PLO or their Authorised Delegate may cast ballots.</span>
					{:else}
						<span>You hold observer access. Ballots and quorum tallies are visible in read-only mode.</span>
					{/if}
				</div>
			{/if}

			<!-- Open Decisions -->
			<div class="space-y-4">
				<h2 class="text-base font-extrabold text-[var(--color-text-primary)] flex items-center gap-2">
					<span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
					Open Decisions Requiring Ballots ({data.openPolls.length})
				</h2>

				{#each data.openPolls as poll}
					{@const tallies = calculateTallies(poll)}
					{@const myVote = poll.votes.find((v: any) => v.userId === data.user.id || (data.user.sponsoringMainPloUserId && v.userId === data.user.sponsoringMainPloUserId))}
					<div class="bg-[var(--color-bg-surface)] rounded-2xl border border-[var(--color-border)] shadow-sm p-4 sm:p-6 space-y-4">
						<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-[var(--color-border)] pb-3">
							<div class="flex items-center gap-2">
								<span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
									Open
								</span>
								<span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300">
									{poll.resolutionType === 'special' ? 'Special Resolution (≥75%)' : 'Simple Majority (>50%)'}
								</span>
							</div>
							{#if poll.closesAt}
								<div class="text-xs text-[var(--color-text-secondary)] flex items-center gap-1 font-mono">
									<Clock class="w-3.5 h-3.5" />
									Closes: {new Date(poll.closesAt).toLocaleDateString('en-ZA')}
								</div>
							{/if}
						</div>

						<div>
							<h3 class="text-base font-extrabold text-[var(--color-text-primary)]">{poll.title}</h3>
							<p class="text-xs text-[var(--color-text-secondary)] mt-1 leading-relaxed">{poll.description}</p>
						</div>

						<!-- Turnout Progress Bar -->
						<div class="space-y-1 bg-[var(--color-bg-base)] p-3 rounded-xl border border-[var(--color-border)]">
							<div class="flex justify-between text-xs">
								<span class="font-medium text-[var(--color-text-secondary)]">Turnout:</span>
								<span class="font-bold tabular-nums font-mono">{tallies.turnoutPct.toFixed(2)}% of 100% ({tallies.quorumMet ? 'Quorum Met' : 'Quorum Pending ≥50%'})</span>
							</div>
							<div class="w-full bg-[var(--color-border)]/50 h-2 rounded-full overflow-hidden">
								<div class="h-full bg-[var(--color-primary)] rounded-full" style="width: {Math.min(tallies.turnoutPct, 100)}%"></div>
							</div>
						</div>

						<!-- Voting Action Triggers for Main PLO & Delegate -->
						{#if data.canVote}
							{#if myVote}
								<div class="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 flex items-center justify-between text-xs">
									<div class="flex items-center gap-2 text-emerald-800 dark:text-emerald-200">
										<CheckCircle2 class="w-4 h-4 shrink-0" />
										{#if myVote.userId === data.user.id}
											<span>Your ballot is recorded: <strong class="uppercase font-bold">{myVote.choice}</strong> ({myVote.weightBps} bps committed).</span>
										{:else}
											<span>Ballot recorded for your portion by <strong>{myVote.voter?.name || 'Landowner / Proxy'}</strong>: <strong class="uppercase font-bold">{myVote.choice}</strong> ({myVote.weightBps} bps committed).</span>
										{/if}
									</div>
									<span class="text-[11px] font-mono text-emerald-700 dark:text-emerald-300">Audited</span>
								</div>
							{:else}
								<div class="pt-2 border-t border-[var(--color-border)] flex items-center gap-3">
									<button
										type="button"
										onclick={() => openVoteModal(poll, 'agree')}
										class="btn btn-sm flex-1 bg-emerald-700 text-white hover:bg-emerald-800 border-0 text-xs font-bold flex items-center justify-center gap-1.5 rounded-xl shadow-xs"
									>
										<Check class="w-4 h-4" /> Agree
									</button>
									<button
										type="button"
										onclick={() => openVoteModal(poll, 'disagree')}
										class="btn btn-sm flex-1 bg-rose-700 text-white hover:bg-rose-800 border-0 text-xs font-bold flex items-center justify-center gap-1.5 rounded-xl shadow-xs"
									>
										<X class="w-4 h-4" /> Disagree
									</button>
									<button
										type="button"
										onclick={() => openVoteModal(poll, 'abstain')}
										class="btn btn-sm px-4 bg-stone-200 text-stone-800 hover:bg-stone-300 dark:bg-stone-800 dark:text-stone-200 border-0 text-xs font-bold rounded-xl"
									>
										<Minus class="w-4 h-4" /> Abstain
									</button>
								</div>
							{/if}
						{/if}

						<!-- Secretary Proxy Voting Trigger (e.g. Received via WhatsApp) -->
						{#if data.isSecretary}
							<div class="pt-3 border-t border-[var(--color-border)] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-purple-50/50 dark:bg-purple-950/20 p-3.5 rounded-xl border border-purple-200/60 dark:border-purple-900/40">
								<div class="text-xs">
									<div class="font-bold text-purple-900 dark:text-purple-300 flex items-center gap-1.5">
										<MessageCircle class="w-4 h-4 text-purple-600 dark:text-purple-400" />
										Secretary Proxy Voting
									</div>
									<div class="text-[11px] text-[var(--color-text-secondary)]">
										Record a ballot on behalf of a Main PLO member who sent their vote via WhatsApp, phone, or proxy.
									</div>
								</div>
								<button
									type="button"
									onclick={() => openProxyModal(poll)}
									class="btn btn-sm bg-purple-700 hover:bg-purple-800 text-white border-0 text-xs font-bold px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 shadow-xs shrink-0"
								>
									<MessageCircle class="w-3.5 h-3.5" />
									Record Member Vote (WhatsApp)
								</button>
							</div>
						{/if}
					</div>
				{:else}
					<div class="py-12 text-center text-xs text-[var(--color-text-secondary)] bg-[var(--color-bg-surface)] rounded-2xl border border-[var(--color-border)] p-6">
						No decisions currently open. Resolutions will appear here when posted by the Secretary.
					</div>
				{/each}
			</div>

			<!-- Closed Decisions -->
			{#if data.closedPolls.length > 0}
				<div class="space-y-4 pt-4 border-t border-[var(--color-border)]">
					<h2 class="text-base font-extrabold text-[var(--color-text-primary)]">
						Closed & Ratified Resolutions ({data.closedPolls.length})
					</h2>

					{#each data.closedPolls as poll}
						{@const tallies = calculateTallies(poll)}
						<div class="bg-[var(--color-bg-surface)] rounded-2xl border border-[var(--color-border)] shadow-sm p-4 sm:p-6 space-y-3">
							<div class="flex items-center justify-between text-xs">
								<span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider {tallies.passed ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'}">
									{tallies.passed ? 'Adopted / Passed' : 'Rejected'}
								</span>
								<span class="font-mono text-[var(--color-text-secondary)]">Turnout: {tallies.turnoutPct.toFixed(2)}%</span>
							</div>
							<h3 class="text-sm font-extrabold">{poll.title}</h3>
							<div class="text-xs text-[var(--color-text-secondary)] leading-relaxed">{poll.description}</div>
							<div class="text-xs font-mono font-bold text-emerald-600">
								Approval: {tallies.agreePct.toFixed(2)}% of decisive vote pool
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>

	<!-- ========================================================================= -->
	<!-- TAB 2: LAND PORTIONS ROSTER -->
	<!-- ========================================================================= -->
	{:else if data.isSecretary && activeTab === 'portions'}
		<div class="space-y-6 animate-fadeIn">
			<!-- Invariant Capacity Bar -->
			<div class="bg-[var(--color-bg-surface)] p-4 sm:p-6 rounded-2xl border border-[var(--color-border)] shadow-sm space-y-2">
				<div class="flex items-center justify-between text-xs">
					<span class="font-bold text-[var(--color-text-primary)]">Total Surveyed Reserve Capacity:</span>
					<span class="font-mono font-bold">{data.stats.totalPercentage.toFixed(2)}% of 100.00% ({data.stats.totalBps} / 10,000 bps)</span>
				</div>
				<div class="w-full bg-[var(--color-border)]/50 h-3 rounded-full overflow-hidden">
					<div class="h-full bg-[var(--color-primary)] rounded-full" style="width: {Math.min(data.stats.totalPercentage, 100)}%"></div>
				</div>
				<div class="text-[11px] text-[var(--color-text-secondary)]">
					Consolidated reserve cadastral surface: <strong>{data.stats.totalHectares.toLocaleString('en-ZA')} hectares</strong>.
				</div>
			</div>

			<!-- Portions Table -->
			<div class="bg-[var(--color-bg-surface)] rounded-2xl border border-[var(--color-border)] shadow-sm overflow-hidden">
				<div class="p-4 sm:p-5 border-b border-[var(--color-border)]">
					<h2 class="font-extrabold text-base text-[var(--color-text-primary)]">
						Official Surveyed Portions ({data.portions.length})
					</h2>
					<p class="text-xs text-[var(--color-text-secondary)]">
						Cadastral title deeds and proportional voting power weights.
					</p>
				</div>

				<div class="overflow-x-auto">
					<table class="table table-zebra w-full text-left text-sm">
						<thead class="bg-[var(--color-bg-base)] border-b border-[var(--color-border)] text-xs font-bold uppercase text-[var(--color-text-secondary)]">
							<tr>
								<th class="py-3 px-4">Portion Name</th>
								<th class="py-3 px-4">Registered Owner</th>
								<th class="py-3 px-4 text-right">Surface (Hectares)</th>
								<th class="py-3 px-4 text-right">Ownership Share</th>
								<th class="py-3 px-4 text-right">Voting Basis Points</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-[var(--color-border)]">
							{#each data.portions as port}
								<tr class="hover:bg-[var(--color-border)]/20 transition-colors">
									<td class="py-3 px-4 font-bold text-xs">{port.portionName}</td>
									<td class="py-3 px-4 text-xs">{port.owner?.name || 'Unassigned'}</td>
									<td class="py-3 px-4 text-right font-mono font-medium text-xs">{port.hectares.toLocaleString('en-ZA')} ha</td>
									<td class="py-3 px-4 text-right font-mono font-extrabold text-[var(--color-secondary)] text-xs">
										{(port.ownershipBps / 100).toFixed(2)}%
									</td>
									<td class="py-3 px-4 text-right font-mono text-xs">{port.ownershipBps} bps</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</div>
		</div>

	<!-- ========================================================================= -->
	<!-- TAB 3: FAMILY ASSOCIATES -->
	<!-- ========================================================================= -->
	{:else if data.isSecretary && activeTab === 'associates'}
		<div class="space-y-6 animate-fadeIn">
			<div class="bg-[var(--color-bg-surface)] rounded-2xl border border-[var(--color-border)] shadow-sm overflow-hidden">
				<div class="p-4 sm:p-5 border-b border-[var(--color-border)] flex items-center justify-between">
					<div>
						<h2 class="font-extrabold text-base text-[var(--color-text-primary)]">
							Linked Associate Members ({data.associates.length})
						</h2>
						<p class="text-xs text-[var(--color-text-secondary)]">
							Family members and authorized delegates who hold read-only visibility into reserve operations.
						</p>
					</div>
					<button
						type="button"
						onclick={() => (showAddAssociateModal = true)}
						class="btn btn-xs bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary)]/90 text-xs font-bold"
					>
						<UserPlus class="w-3.5 h-3.5" />
						Add Associate
					</button>
				</div>

				<div class="overflow-x-auto">
					<table class="table table-zebra w-full text-left text-sm">
						<thead class="bg-[var(--color-bg-base)] border-b border-[var(--color-border)] text-xs font-bold uppercase text-[var(--color-text-secondary)]">
							<tr>
								<th class="py-3 px-4">Name</th>
								<th class="py-3 px-4">Email</th>
								<th class="py-3 px-4">Relationship</th>
								<th class="py-3 px-4">Sponsoring Landowner</th>
								<th class="py-3 px-4 text-center">Action</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-[var(--color-border)]">
							{#each data.associates as assoc}
								<tr class="hover:bg-[var(--color-border)]/20 transition-colors">
									<td class="py-3 px-4 font-bold text-xs">{assoc.associateUser?.name}</td>
									<td class="py-3 px-4 text-xs font-mono">{assoc.associateUser?.email}</td>
									<td class="py-3 px-4 text-xs">
										{#if assoc.relationship === 'delegate'}
											<span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
												Authorised Delegate
											</span>
										{:else if assoc.relationship === 'co_owner'}
											<span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
												Co-Owner
											</span>
										{:else}
											<span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300">
												Family Member
											</span>
										{/if}
									</td>
									<td class="py-3 px-4 text-xs">{assoc.sponsorUser?.name}</td>
									<td class="py-3 px-4 text-center">
										<form method="POST" action="?/deleteAssociate" use:enhance>
											<input type="hidden" name="id" value={assoc.id} />
											<button
												type="submit"
												class="p-1 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
												title="Remove Associate"
												onclick={(e) => {
													if (!confirm('Remove this associate delegate?')) e.preventDefault();
												}}
											>
												<Trash2 class="w-4 h-4" />
											</button>
										</form>
									</td>
								</tr>
							{:else}
								<tr>
									<td colspan="5" class="py-12 text-center text-xs text-[var(--color-text-secondary)]">
										No family or associate delegates linked yet.
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</div>
		</div>
	{/if}
</div>

<!-- ========================================================================= -->
<!-- MODAL: BALLOT CONFIRMATION SHEET -->
<!-- ========================================================================= -->
{#if selectedPoll}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn"
		role="dialog"
		aria-modal="true"
		aria-labelledby="confirm-ballot-title"
	>
		<div class="bg-[var(--color-bg-surface)] border border-[var(--color-border)] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
			<div class="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
				<div class="flex items-center gap-2">
					<div class="w-8 h-8 rounded-lg bg-[var(--color-primary)] text-white flex items-center justify-center">
						<Vote class="w-4 h-4" />
					</div>
					<div>
						<h3 id="confirm-ballot-title" class="font-extrabold text-base">Confirm Ballot Submission</h3>
						<p class="text-xs text-[var(--color-text-secondary)]">Constitutional voting commitment</p>
					</div>
				</div>
				<button type="button" onclick={() => (selectedPoll = null)} class="p-1.5 rounded-lg hover:bg-[var(--color-border)]/40" aria-label="Close modal">
					<X class="w-4 h-4" />
				</button>
			</div>

			<div class="space-y-3 text-xs bg-[var(--color-bg-base)] p-3.5 rounded-xl border border-[var(--color-border)]">
				<div class="font-bold text-sm text-[var(--color-text-primary)]">{selectedPoll.title}</div>
				<div class="flex justify-between text-xs pt-2 border-t border-[var(--color-border)]">
					<span class="text-[var(--color-text-secondary)]">Your Committed Stance:</span>
					<strong class="uppercase font-extrabold {selectedChoice === 'agree' ? 'text-emerald-600' : selectedChoice === 'disagree' ? 'text-rose-600' : 'text-stone-600'}">
						{selectedChoice}
					</strong>
				</div>
				<div class="flex justify-between text-xs">
					<span class="text-[var(--color-text-secondary)]">Voter Weight Applied:</span>
					<span class="font-mono font-bold text-[var(--color-primary)]">{data.user.ownershipPercentage?.toFixed(2)}% ({data.user.voteWeightBps} bps)</span>
				</div>
				{#if data.user.associateRelationship === 'delegate'}
					<div class="flex items-center justify-between text-xs pt-2 border-t border-[var(--color-border)] text-amber-700 dark:text-amber-400 font-semibold">
						<span>Voting Proxy:</span>
						<span>Voting on behalf of {data.user.sponsorName || 'Main PLO'}</span>
					</div>
				{/if}
			</div>

			<form
				method="POST"
				action="?/castVote"
				use:enhance={() => {
					isSubmittingVote = true;
					return async ({ result, update }) => {
						isSubmittingVote = false;
						if (result.type === 'success') {
							selectedPoll = null;
						}
						await update();
					};
				}}
			>
				<input type="hidden" name="pollId" value={selectedPoll.id} />
				<input type="hidden" name="choice" value={selectedChoice} />

				<div class="flex justify-end gap-2 pt-2 border-t border-[var(--color-border)]">
					<button type="button" onclick={() => (selectedPoll = null)} class="px-4 py-2 rounded-xl text-xs font-bold border border-[var(--color-border)]">Cancel</button>
					<button type="submit" disabled={isSubmittingVote} class="btn bg-[var(--color-primary)] text-white border-0 text-xs font-bold px-4 py-2 rounded-xl">
						{isSubmittingVote ? 'Committing Ballot...' : 'Confirm & Commit Ballot'}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- ========================================================================= -->
<!-- MODAL: ADD ASSOCIATE MEMBER -->
<!-- ========================================================================= -->
{#if showAddAssociateModal}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn"
		role="dialog"
		aria-modal="true"
		aria-labelledby="add-associate-title"
	>
		<div class="bg-[var(--color-bg-surface)] border border-[var(--color-border)] rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
			<div class="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
				<div class="flex items-center gap-2">
					<div class="w-8 h-8 rounded-lg bg-[var(--color-primary)] text-white flex items-center justify-center">
						<UserPlus class="w-4 h-4" />
					</div>
					<div>
						<h3 id="add-associate-title" class="font-extrabold text-base">Add Associate Member</h3>
						<p class="text-xs text-[var(--color-text-secondary)]">Create linked family/delegate account</p>
					</div>
				</div>
				<button type="button" onclick={() => (showAddAssociateModal = false)} class="p-1.5 rounded-lg hover:bg-[var(--color-border)]/40" aria-label="Close modal">
					<X class="w-4 h-4" />
				</button>
			</div>

			<form
				method="POST"
				action="?/createAssociate"
				use:enhance={() => {
					isSubmittingAssociate = true;
					return async ({ result, update }) => {
						isSubmittingAssociate = false;
						if (result.type === 'success') {
							showAddAssociateModal = false;
							newAssocName = '';
							newAssocEmail = '';
							newAssocUsername = '';
							newAssocPhone = '';
							newAssocPassword = '';
						}
						await update();
					};
				}}
				class="space-y-4"
			>
				{#if data.isSecretary}
					<div class="space-y-1">
						<label for="assoc-sponsor-select" class="text-xs font-bold text-[var(--color-text-secondary)] block">Sponsoring Landowner (Main PLO)</label>
						<select id="assoc-sponsor-select" name="sponsoringMainPloUserId" bind:value={newAssocSponsorId} class="select select-bordered select-sm w-full text-xs">
							{#each data.mainPloMembers as m}
								<option value={m.id}>{m.name} ({m.portionNames})</option>
							{/each}
						</select>
					</div>
				{/if}

				<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
					<div class="space-y-1">
						<label for="assoc-name-input" class="text-xs font-bold text-[var(--color-text-secondary)] block">Full Name</label>
						<input id="assoc-name-input" type="text" name="name" required placeholder="e.g. Marie Steyn" bind:value={newAssocName} class="input input-bordered input-sm w-full text-xs" />
					</div>
					<div class="space-y-1">
						<label for="assoc-email-input" class="text-xs font-bold text-[var(--color-text-secondary)] block">Email</label>
						<input id="assoc-email-input" type="email" name="email" required placeholder="marie@example.co.za" bind:value={newAssocEmail} class="input input-bordered input-sm w-full text-xs font-mono" />
					</div>
				</div>

				<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
					<div class="space-y-1">
						<label for="assoc-username-input" class="text-xs font-bold text-[var(--color-text-secondary)] block">Username</label>
						<input id="assoc-username-input" type="text" name="username" placeholder="mariesteyn" bind:value={newAssocUsername} class="input input-bordered input-sm w-full text-xs font-mono" />
					</div>
					<div class="space-y-1">
						<label for="assoc-relationship-select" class="text-xs font-bold text-[var(--color-text-secondary)] block">Role & Permissions</label>
						<select id="assoc-relationship-select" name="relationship" bind:value={newAssocRelationship} class="select select-bordered select-sm w-full text-xs">
							<option value="family">Family Member (View Only)</option>
							<option value="co_owner">Co-Owner (Can Add Calendar Entries)</option>
							<option value="delegate">Authorised Delegate (Can Vote on Behalf of Main PLO)</option>
						</select>
					</div>
				</div>

				<div class="space-y-1">
					<label for="assoc-password-input" class="text-xs font-bold text-[var(--color-text-secondary)] block">Initial Password</label>
					<input id="assoc-password-input" type="password" name="password" required placeholder="••••••••" bind:value={newAssocPassword} class="input input-bordered input-sm w-full text-xs" />
				</div>

				<div class="flex justify-end gap-2 pt-2 border-t border-[var(--color-border)]">
					<button type="button" onclick={() => (showAddAssociateModal = false)} class="px-4 py-2 rounded-xl text-xs font-bold border border-[var(--color-border)]">Cancel</button>
					<button type="submit" disabled={isSubmittingAssociate} class="btn bg-[var(--color-primary)] text-white border-0 text-xs font-bold px-4 py-2 rounded-xl">
						{isSubmittingAssociate ? 'Creating...' : 'Create Associate Account'}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- ========================================================================= -->
<!-- MODAL: SECRETARY PROXY BALLOT RECORDING (WHATSAPP / PHONE / PROXY)        -->
<!-- ========================================================================= -->
{#if showProxyModal && proxyPoll}
	{@const votedMemberIds = new Set((proxyPoll.votes || []).map((v: any) => v.userId))}
	{@const eligibleMembers = (data.mainPloMembers || []).filter((m: any) => !votedMemberIds.has(m.id))}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn"
		role="dialog"
		aria-modal="true"
		aria-labelledby="proxy-modal-title"
	>
		<div class="bg-[var(--color-bg-surface)] border border-[var(--color-border)] rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
			<div class="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
				<div class="flex items-center gap-2">
					<div class="w-8 h-8 rounded-lg bg-purple-700 text-white flex items-center justify-center">
						<MessageCircle class="w-4 h-4" />
					</div>
					<div>
						<h3 id="proxy-modal-title" class="font-extrabold text-base">Record Member Vote (Proxy)</h3>
						<p class="text-xs text-[var(--color-text-secondary)]">Secretary WhatsApp / Out-of-Band Proxy</p>
					</div>
				</div>
				<button type="button" onclick={() => (showProxyModal = false)} class="p-1.5 rounded-lg hover:bg-[var(--color-border)]/40" aria-label="Close modal">
					<X class="w-4 h-4" />
				</button>
			</div>

			<form
				method="POST"
				action="?/castVote"
				use:enhance={() => {
					isSubmittingProxy = true;
					return async ({ result, update }) => {
						isSubmittingProxy = false;
						if (result.type === 'success') {
							showProxyModal = false;
							proxyNotes = '';
						}
						await update();
					};
				}}
				class="space-y-4 text-xs"
			>
				<input type="hidden" name="pollId" value={proxyPoll.id} />

				<!-- Decision Summary -->
				<div class="p-3 rounded-xl bg-[var(--color-bg-base)] border border-[var(--color-border)] space-y-1">
					<span class="text-[10px] uppercase font-bold text-[var(--color-text-secondary)]">Target Decision</span>
					<div class="font-bold text-sm text-[var(--color-text-primary)]">{proxyPoll.title}</div>
				</div>

				<!-- Member Select -->
				<div class="space-y-1">
					<label for="proxy-member-select" class="font-bold text-[var(--color-text-secondary)] block">
						Select Main PLO Landowner
					</label>
					{#if eligibleMembers.length === 0}
						<div class="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-200 text-xs">
							All eligible Main PLO members have already cast ballots for this decision.
						</div>
					{:else}
						<select
							id="proxy-member-select"
							name="targetUserId"
							bind:value={proxyTargetUserId}
							required
							class="select select-bordered select-sm w-full text-xs font-medium"
						>
							{#each data.mainPloMembers as m}
								<option value={m.id} disabled={votedMemberIds.has(m.id)}>
									{m.name} — {m.portionNames} ({m.ownershipPercentage.toFixed(2)}% | {m.voteWeightBps} bps){votedMemberIds.has(m.id) ? ' — [Already Voted]' : ''}
								</option>
							{/each}
						</select>
					{/if}
				</div>

				<!-- Vote Choice -->
				<fieldset class="space-y-1.5 border-0 p-0 m-0">
					<legend class="font-bold text-[var(--color-text-secondary)] block text-xs">
						Member's Vote Stance
					</legend>
					<div class="grid grid-cols-3 gap-2">
						<label class="flex items-center justify-center gap-1.5 p-2.5 rounded-xl border cursor-pointer font-bold transition-all focus-within:ring-2 focus-within:ring-[var(--color-primary)] {proxyChoice === 'agree' ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs' : 'border-[var(--color-border)] hover:bg-[var(--color-border)]/20'}">
							<input type="radio" name="choice" value="agree" bind:group={proxyChoice} class="sr-only" />
							<Check class="w-3.5 h-3.5" /> Agree
						</label>
						<label class="flex items-center justify-center gap-1.5 p-2.5 rounded-xl border cursor-pointer font-bold transition-all focus-within:ring-2 focus-within:ring-[var(--color-primary)] {proxyChoice === 'disagree' ? 'bg-rose-600 text-white border-rose-600 shadow-xs' : 'border-[var(--color-border)] hover:bg-[var(--color-border)]/20'}">
							<input type="radio" name="choice" value="disagree" bind:group={proxyChoice} class="sr-only" />
							<X class="w-3.5 h-3.5" /> Disagree
						</label>
						<label class="flex items-center justify-center gap-1.5 p-2.5 rounded-xl border cursor-pointer font-bold transition-all focus-within:ring-2 focus-within:ring-[var(--color-primary)] {proxyChoice === 'abstain' ? 'bg-stone-700 text-white border-stone-700 shadow-xs' : 'border-[var(--color-border)] hover:bg-[var(--color-border)]/20'}">
							<input type="radio" name="choice" value="abstain" bind:group={proxyChoice} class="sr-only" />
							<Minus class="w-3.5 h-3.5" /> Abstain
						</label>
					</div>
				</fieldset>

				<!-- Channel & Notes -->
				<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
					<div class="space-y-1">
						<label for="proxy-channel-select" class="font-bold text-[var(--color-text-secondary)] block">Communication Channel</label>
						<select id="proxy-channel-select" name="channel" bind:value={proxyChannel} class="select select-bordered select-sm w-full text-xs">
							<option value="WhatsApp">WhatsApp Message / Voice Note</option>
							<option value="Phone Call">Phone Call</option>
							<option value="SMS">SMS</option>
							<option value="Email">Email</option>
							<option value="In Person">In Person / Meeting Proxy</option>
						</select>
					</div>
					<div class="space-y-1">
						<label for="proxy-notes-input" class="font-bold text-[var(--color-text-secondary)] block">Audit Notes (Optional)</label>
						<input
							id="proxy-notes-input"
							type="text"
							name="notes"
							maxlength="500"
							placeholder="e.g. Sent via WhatsApp at 09:45"
							bind:value={proxyNotes}
							class="input input-bordered input-sm w-full text-xs"
						/>
					</div>
				</div>

				<div class="flex justify-end gap-2 pt-2 border-t border-[var(--color-border)]">
					<button type="button" onclick={() => (showProxyModal = false)} class="px-4 py-2 rounded-xl text-xs font-bold border border-[var(--color-border)]">Cancel</button>
					<button
						type="submit"
						disabled={isSubmittingProxy || eligibleMembers.length === 0}
						class="btn bg-purple-700 hover:bg-purple-800 text-white border-0 text-xs font-bold px-4 py-2 rounded-xl shadow-xs"
					>
						{isSubmittingProxy ? 'Recording Ballot...' : 'Confirm & Record Proxy Vote'}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- ========================================================================= -->
<!-- MODAL: CREATE RESERVE DECISION (SECRETARY)                               -->
<!-- ========================================================================= -->
{#if showCreateDecisionModal}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn"
		role="dialog"
		aria-modal="true"
		aria-labelledby="gov-create-decision-title"
	>
		<div class="bg-[var(--color-bg-surface)] border border-[var(--color-border)] rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
			<div class="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
				<div class="flex items-center gap-2">
					<div class="w-8 h-8 rounded-lg bg-[var(--color-primary)] text-white flex items-center justify-center">
						<Plus class="w-4 h-4" />
					</div>
					<div>
						<h3 id="gov-create-decision-title" class="font-extrabold text-base">Create Reserve Decision</h3>
						<p class="text-xs text-[var(--color-text-secondary)]">Post new voting decision for Main PLO members</p>
					</div>
				</div>
				<button type="button" onclick={() => (showCreateDecisionModal = false)} class="p-1.5 rounded-lg hover:bg-[var(--color-border)]/40" aria-label="Close modal"><X class="w-4 h-4" /></button>
			</div>
			<form
				method="POST"
				action="?/createDecision"
				use:enhance={() => {
					isSubmittingDecision = true;
					return async ({ result, update }) => {
						isSubmittingDecision = false;
						if (result.type === 'success') {
							showCreateDecisionModal = false;
							newDecisionTitle = '';
							newDecisionDescription = '';
							newDecisionClosesAt = '';
						}
						await update();
					};
				}}
				class="space-y-4 text-xs"
			>
				<div class="space-y-1">
					<label for="gov-decision-title" class="font-bold text-[var(--color-text-secondary)] block">Decision Title</label>
					<input id="gov-decision-title" type="text" name="title" required placeholder="e.g. Allocation for Perimeter Sensor Telemetry" bind:value={newDecisionTitle} class="input input-bordered input-sm w-full text-xs font-bold" />
				</div>
				<div class="space-y-1">
					<label for="gov-decision-desc" class="font-bold text-[var(--color-text-secondary)] block">Description / Rationale</label>
					<textarea id="gov-decision-desc" name="description" required rows="3" placeholder="Explain the constitutional, operational, or financial rationale..." bind:value={newDecisionDescription} class="textarea textarea-bordered textarea-sm w-full text-xs"></textarea>
				</div>
				<div class="grid grid-cols-2 gap-3">
					<div class="space-y-1">
						<label for="gov-decision-resolution-type" class="font-bold text-[var(--color-text-secondary)] block">Resolution Threshold</label>
						<select id="gov-decision-resolution-type" name="resolutionType" bind:value={newDecisionResolutionType} class="select select-bordered select-sm w-full text-xs">
							<option value="simple">Simple Majority (&gt;50%)</option>
							<option value="special">Special Resolution (≥75%)</option>
						</select>
					</div>
					<div class="space-y-1">
						<label for="gov-decision-closes-at" class="font-bold text-[var(--color-text-secondary)] block">Closing Date</label>
						<input id="gov-decision-closes-at" type="date" name="closesAt" bind:value={newDecisionClosesAt} class="input input-bordered input-sm w-full text-xs font-mono" />
					</div>
				</div>
				<div class="flex justify-end gap-2 pt-2 border-t border-[var(--color-border)]">
					<button type="button" onclick={() => (showCreateDecisionModal = false)} class="px-4 py-2 rounded-xl text-xs font-bold border border-[var(--color-border)]">Cancel</button>
					<button type="submit" disabled={isSubmittingDecision} class="btn bg-[var(--color-primary)] text-white border-0 text-xs font-bold px-4 py-2 rounded-xl shadow-xs">
						{isSubmittingDecision ? 'Publishing...' : 'Publish Decision'}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}
