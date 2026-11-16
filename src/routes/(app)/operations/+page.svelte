<script lang="ts">
	import {
		Calendar as CalendarIcon,
		Crosshair,
		Binoculars,
		Plus,
		ChevronLeft,
		ChevronRight,
		Clock,
		AlertTriangle,
		CheckCircle2,
		AlertCircle,
		Trash2,
		Eye,
		X,
		Compass,
		Layers,
		ArrowRight,
		SlidersHorizontal,
		ShoppingCart,
		User,
		Handshake,
		Check,
		Tag,
		ChevronDown,
		CalendarDays,
		Radio,
		Vote
	} from 'lucide-svelte';
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import { getVisitIconComponent } from '$lib/constants/visit-icons';
	import { getMemberColor } from '$lib/constants/member-colors';

	let { data, form } = $props();

	// Reactive Active Tab ('calendar' | 'quotas' | 'census')
	let activeTab = $state<'calendar' | 'quotas' | 'census'>('calendar');

	$effect(() => {
		const paramTab = page.url.searchParams.get('tab');
		if (data.isSecretary && (paramTab === 'quotas' || paramTab === 'census' || paramTab === 'calendar')) {
			activeTab = paramTab;
		} else {
			activeTab = 'calendar';
		}
	});

	function setTab(tab: 'calendar' | 'quotas' | 'census') {
		if (!data.isSecretary && tab !== 'calendar') return;
		activeTab = tab;
		const url = new URL(window.location.href);
		url.searchParams.set('tab', tab);
		window.history.replaceState({}, '', url.toString());
	}

	// ==========================================
	// 1. CALENDAR STATE & LOGIC
	// ==========================================
	// Start with Month Grid view by default as requested!
	let viewMode = $state<'grid' | 'week' | 'agenda'>('grid');
	let showBookModal = $state(false);
	let isSubmittingBooking = $state(false);
	let isLegendOpen = $state(false);
	let bookingToDelete = $state<any | null>(null);
	let isDeletingBooking = $state(false);

	function canDeleteEntry(entry: any): boolean {
		return Boolean(data.isSecretary || entry?.userId === data.user?.id);
	}

	let newStartDate = $state(new Date().toISOString().split('T')[0]);
	let newEndDate = $state(new Date().toISOString().split('T')[0]);
	let newPurpose = $state(data.masterVisitCategories?.[0]?.key || 'leisure');
	let newNotes = $state('');
	let newTargetUserId = $state(data.user.id);

	let currentDate = $state(new Date());
	let currentYear = $derived(currentDate.getFullYear());
	let currentMonth = $derived(currentDate.getMonth());

	const monthNames = [
		'January', 'February', 'March', 'April', 'May', 'June',
		'July', 'August', 'September', 'October', 'November', 'December'
	];

	function prevMonth() {
		currentDate = new Date(currentYear, currentMonth - 1, 1);
	}
	function nextMonth() {
		currentDate = new Date(currentYear, currentMonth + 1, 1);
	}
	function prevWeek() {
		currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() - 7);
	}
	function nextWeek() {
		currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() + 7);
	}
	function prevPeriod() {
		if (viewMode === 'week') {
			prevWeek();
		} else {
			prevMonth();
		}
	}
	function nextPeriod() {
		if (viewMode === 'week') {
			nextWeek();
		} else {
			nextMonth();
		}
	}
	function jumpToToday() {
		currentDate = new Date();
	}

	// Today's date string in client timezone (YYYY-MM-DD)
	const todayDateStr = $derived.by(() => {
		const now = new Date();
		const y = now.getFullYear();
		const m = String(now.getMonth() + 1).padStart(2, '0');
		const d = String(now.getDate()).padStart(2, '0');
		return `${y}-${m}-${d}`;
	});

	const calendarDays = $derived.by(() => {
		const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
		const daysInCurrentMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
		const days = [];
		for (let i = 0; i < firstDayIndex; i++) {
			days.push({ day: 0, dateStr: '', isCurrentMonth: false, entries: [] });
		}
		for (let d = 1; d <= daysInCurrentMonth; d++) {
			const mStr = String(currentMonth + 1).padStart(2, '0');
			const dStr = String(d).padStart(2, '0');
			const dateStr = `${currentYear}-${mStr}-${dStr}`;
			const dayEntries = data.calendar.entries.filter(
				(e: any) => e.startDate <= dateStr && e.endDate >= dateStr
			);
			days.push({ day: d, dateStr, isCurrentMonth: true, entries: dayEntries });
		}
		return days;
	});

	const weekDays = $derived.by(() => {
		const base = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
		const dayOfWeek = base.getDay(); // 0 (Sun) to 6 (Sat)
		const sunday = new Date(base);
		sunday.setDate(base.getDate() - dayOfWeek);

		const shortDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
		const fullDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
		const shortMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

		const days = [];
		for (let i = 0; i < 7; i++) {
			const d = new Date(sunday);
			d.setDate(sunday.getDate() + i);
			const y = d.getFullYear();
			const m = String(d.getMonth() + 1).padStart(2, '0');
			const dayNum = d.getDate();
			const dStr = String(dayNum).padStart(2, '0');
			const dateStr = `${y}-${m}-${dStr}`;
			const dayEntries = data.calendar.entries.filter(
				(e: any) => e.startDate <= dateStr && e.endDate >= dateStr
			);
			days.push({
				date: d,
				day: dayNum,
				dayNameShort: shortDays[i],
				dayNameFull: fullDays[i],
				monthShort: shortMonths[d.getMonth()],
				year: y,
				dateStr,
				isToday: dateStr === todayDateStr,
				isCurrentMonth: d.getMonth() === currentMonth,
				entries: dayEntries
			});
		}
		return days;
	});

	const weekRangeLabel = $derived.by(() => {
		if (weekDays.length < 7) return '';
		const first = weekDays[0];
		const last = weekDays[6];
		if (first.monthShort === last.monthShort && first.year === last.year) {
			return `${first.day} – ${last.day} ${first.monthShort} ${first.year}`;
		}
		if (first.year === last.year) {
			return `${first.day} ${first.monthShort} – ${last.day} ${last.monthShort} ${first.year}`;
		}
		return `${first.day} ${first.monthShort} ${first.year} – ${last.day} ${last.monthShort} ${last.year}`;
	});

	let selectedDayDetails = $state<string | null>(null);
	const selectedDayEntries = $derived(
		selectedDayDetails
			? data.calendar.entries.filter((e: any) => selectedDayDetails! >= e.startDate && selectedDayDetails! <= e.endDate)
			: []
	);

	// Agenda: Filter out past visits (where endDate < todayDateStr)
	// Current visits: Active in reserve right now (startDate <= today && endDate >= today)
	const currentVisits = $derived(
		(data.calendar?.entries || [])
			.filter((e: any) => e.startDate <= todayDateStr && e.endDate >= todayDateStr)
			.sort((a: any, b: any) => a.endDate.localeCompare(b.endDate))
	);

	// Upcoming visits: Future bookings (startDate > today)
	const upcomingVisits = $derived(
		(data.calendar?.entries || [])
			.filter((e: any) => e.startDate > todayDateStr)
			.sort((a: any, b: any) => a.startDate.localeCompare(b.startDate))
	);

	let agendaFilter = $state<'all' | 'current' | 'upcoming'>('all');

	function getDaysDiff(fromStr: string, toStr: string): number {
		const from = new Date(fromStr);
		const to = new Date(toStr);
		const diffTime = to.getTime() - from.getTime();
		return Math.max(0, Math.round(diffTime / (1000 * 60 * 60 * 24)));
	}

	function getCurrentVisitStatus(startDate: string, endDate: string): string {
		if (startDate === todayDateStr && endDate === todayDateStr) {
			return 'Today only';
		}
		if (endDate === todayDateStr) {
			return 'Final day • Departs today';
		}
		const daysLeft = getDaysDiff(todayDateStr, endDate);
		return `Departs in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`;
	}

	function getUpcomingVisitStatus(startDate: string): string {
		const daysUntil = getDaysDiff(todayDateStr, startDate);
		if (daysUntil === 0 || startDate === todayDateStr) {
			return 'Starts today';
		}
		if (daysUntil === 1) {
			return 'Arriving tomorrow';
		}
		return `Arriving in ${daysUntil} days`;
	}

	function formatDateNice(dateStr: string): string {
		if (!dateStr) return '';
		const parts = dateStr.split('-');
		if (parts.length !== 3) return dateStr;
		const [y, m, d] = parts;
		const date = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
		return date.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' });
	}

	function getCategoryMeta(key: string) {
		const found = data.masterVisitCategories.find((c: any) => c.key === key);
		if (found) {
			return {
				label: found.label,
				icon: found.icon || 'Compass',
				colorHex: found.colorHex,
				badgeClass: found.badgeClass,
				description: found.description
			};
		}
		return {
			label: key.replace('_', ' '),
			icon: 'Compass',
			colorHex: '#0284c7',
			badgeClass: 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300',
			description: 'General reserve stay'
		};
	}

	function getEntryMemberColor(entryOrMember: any): string {
		if (entryOrMember?.member?.color) return entryOrMember.member.color;
		if (entryOrMember?.color) return entryOrMember.color;
		if (entryOrMember?.member) return getMemberColor(entryOrMember.member);
		return getMemberColor(entryOrMember);
	}

	// ==========================================
	// 2. QUOTAS & OFF-TAKE STATE & LOGIC
	// ==========================================
	let showHuntModal = $state(false);
	let showBuyRequestModal = $state(false);
	let selectedQuotaId = $state('');
	let huntHeadCount = $state(1);
	let huntDate = $state(new Date().toISOString().split('T')[0]);
	let hunterName = $state(data.user.name);
	let firearmCaliber = $state('.30-06 Springfield');
	let huntNotes = $state('');

	// Want-to-Buy Request State
	let buySpecies = $state(data.masterSpecies?.[0]?.name || 'Kudu');
	let buyHeadCount = $state(2);
	let buyOfferZar = $state('8500');
	let buyNotes = $state('');

	function formatZar(cents: number): string {
		return `R ${(cents / 100).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`;
	}

	// ==========================================
	// 3. CENSUS STATE & LOGIC
	// ==========================================
	let showCensusModal = $state(false);
	let censusSpecies = $state(data.masterSpecies?.[0]?.name || 'Kudu');
	let censusCount = $state(1);
	let censusMethod = $state('ground_transect');
	let censusDate = $state(new Date().toISOString().split('T')[0]);
	let censusObserver = $state(data.user.name);
	let censusNotes = $state('');
</script>

<svelte:head>
	<title>Field Operations — ACNRPLO</title>
</svelte:head>

<div class="space-y-6">
	<!-- Section Title & Sub-Nav Header -->
	<div class="bg-[var(--color-bg-surface)] border border-[var(--color-border)] rounded-2xl p-4 sm:p-6 shadow-sm">
		<div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
			<div>
				{#if data.isSecretary}
					<div class="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--color-primary)]">
						<Compass class="w-4 h-4" />
						Reserve Field Life
					</div>
					<h1 class="text-2xl sm:text-3xl font-extrabold tracking-tight mt-1">
						Field Operations Hub
					</h1>
					<p class="text-xs sm:text-sm text-[var(--color-text-secondary)] mt-1 max-w-2xl">
						Single pane of glass for scheduling reserve trips, managing sustainable biological hunting quotas, and tracking official game census counts.
					</p>
				{:else}
					<div class="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--color-primary)]">
						<CalendarIcon class="w-4 h-4" />
						Reserve Field Operations
					</div>
					<h1 class="text-2xl sm:text-3xl font-extrabold tracking-tight mt-1">
						Shared Reserve Calendar
					</h1>
					<p class="text-xs sm:text-sm text-[var(--color-text-secondary)] mt-1 max-w-2xl">
						Authoritative reserve schedule for landowner visits, scheduled hunts, and reserve maintenance operations.
					</p>
				{/if}
			</div>

			<!-- Quick Primary Triggers based on Tab -->
			<div class="flex items-center gap-2">
				{#if data.isSecretary && activeTab === 'quotas' && data.canManageHunt}
					<button
						type="button"
						onclick={() => (showBuyRequestModal = true)}
						class="btn bg-amber-600 hover:bg-amber-700 text-white border-0 flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold shadow-xs"
					>
						<ShoppingCart class="w-4 h-4" />
						Want-to-Buy Request
					</button>
					<button
						type="button"
						onclick={() => {
							if (data.quotas.myAllocations.length > 0) {
								selectedQuotaId = data.quotas.myAllocations[0].quotaId;
								showHuntModal = true;
							}
						}}
						class="btn bg-emerald-700 text-white hover:bg-emerald-800 border-0 flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold shadow-xs"
					>
						<Crosshair class="w-4 h-4" />
						Log Off-Take (Hunt)
					</button>
				{:else if data.isSecretary && activeTab === 'census'}
					<button
						type="button"
						onclick={() => (showCensusModal = true)}
						class="btn bg-amber-700 text-white hover:bg-amber-800 border-0 flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold shadow-xs"
					>
						<Plus class="w-4 h-4" />
						Record Census
					</button>
				{/if}
			</div>
		</div>

		<!-- Segmented Sub-Navigation Tabs (Secretary Only) -->
		{#if data.isSecretary}
			<div class="flex items-center gap-2 mt-6 pt-4 border-t border-[var(--color-border)] overflow-x-auto pb-1">
				<button
					type="button"
					onclick={() => setTab('calendar')}
					class="px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap {activeTab ===
					'calendar'
						? 'bg-[var(--color-primary)] text-white shadow-sm'
						: 'bg-[var(--color-bg-base)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] border border-[var(--color-border)]'}"
				>
					<CalendarIcon class="w-4 h-4" />
					<span>Calendar & Visits ({data.calendar.entries.length})</span>
				</button>

				<button
					type="button"
					onclick={() => setTab('quotas')}
					class="px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap {activeTab ===
					'quotas'
						? 'bg-[var(--color-primary)] text-white shadow-sm'
						: 'bg-[var(--color-bg-base)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] border border-[var(--color-border)]'}"
				>
					<Crosshair class="w-4 h-4" />
					<span>Hunting Quotas & Requests</span>
				</button>

				<button
					type="button"
					onclick={() => setTab('census')}
					class="px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap {activeTab ===
					'census'
						? 'bg-[var(--color-primary)] text-white shadow-sm'
						: 'bg-[var(--color-bg-base)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] border border-[var(--color-border)]'}"
				>
					<Binoculars class="w-4 h-4" />
					<span>Wildlife Census ({data.census.counts.length})</span>
				</button>
			</div>
		{/if}
	</div>

	<!-- Alert Messages -->
	{#if form?.error}
		<div class="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200 text-sm flex items-center gap-3">
			<AlertCircle class="w-5 h-5 shrink-0" />
			<span>{form.error}</span>
		</div>
	{/if}

	<!-- ========================================================================= -->
	<!-- TAB 1: CALENDAR & VISITS (Starts with Calendar View & Legend)            -->
	<!-- ========================================================================= -->
	{#if activeTab === 'calendar'}
		<div class="space-y-4 sm:space-y-6 animate-fadeIn">
			<!-- Calendar Actions & Controls Row -->
			<div class="flex flex-col lg:flex-row lg:items-start gap-3 sm:gap-4">
				<!-- 1. Book a Visit Button (Full-width on Mobile, First Card on Desktop) -->
				{#if data.calendar.canBook}
					<div class="w-full lg:w-auto shrink-0">
						<button
							type="button"
							onclick={() => (showBookModal = true)}
							class="w-full lg:w-auto h-12 sm:h-[52px] btn bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary)]/90 border-0 flex items-center justify-center gap-2 px-6 py-3 rounded-2xl text-xs sm:text-sm font-bold shadow-xs whitespace-nowrap"
						>
							<Plus class="w-4 h-4" />
							<span>Book a Visit</span>
						</button>
					</div>
				{:else if data.user.associateRelationship === 'family'}
					<div class="w-full lg:w-auto shrink-0 flex items-center gap-2.5 px-4 py-2.5 h-12 sm:h-[52px] rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-surface)] text-xs text-[var(--color-text-secondary)] shadow-xs">
						<Eye class="w-4 h-4 text-stone-500 shrink-0" />
						<div class="leading-tight">
							<span class="font-bold text-[var(--color-text-primary)] block text-[11px]">Family Member Access</span>
							<span class="text-[10px]">View-only reserve calendar</span>
						</div>
					</div>
				{:else if data.user.associateRelationship === 'delegate'}
					<div class="w-full lg:w-auto shrink-0 flex items-center gap-2.5 px-4 py-2.5 h-12 sm:h-[52px] rounded-2xl border border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/20 text-xs text-blue-800 dark:text-blue-300 shadow-xs">
						<Vote class="w-4 h-4 text-blue-600 shrink-0" />
						<div class="leading-tight">
							<span class="font-bold block text-[11px]">Authorised Delegate</span>
							<span class="text-[10px] opacity-80">Voting proxy for {data.user.sponsorName || 'Main PLO'}</span>
						</div>
					</div>
				{/if}

				<!-- 2. Legend Collapsible Card (Full-width on Mobile, Next Card on Desktop) -->
				<div class="w-full lg:flex-1 bg-[var(--color-bg-surface)] rounded-2xl border border-[var(--color-border)] shadow-xs transition-all overflow-hidden">
					<button
						type="button"
						onclick={() => (isLegendOpen = !isLegendOpen)}
						class="w-full h-12 sm:h-[52px] px-3.5 sm:px-4 flex items-center justify-between text-left hover:bg-[var(--color-border)]/20 transition-colors"
						aria-expanded={isLegendOpen}
					>
						<div class="flex items-center gap-2.5 min-w-0">
							<div class="w-7 h-7 rounded-lg bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center shrink-0">
								<Tag class="w-3.5 h-3.5 text-[var(--color-primary)]" />
							</div>
							<div class="flex items-center gap-2 min-w-0">
								<span class="text-xs font-bold text-[var(--color-text-primary)] truncate">
									Calendar Legend
								</span>
								<!-- Member Colors & Reason Icons Preview -->
								<div class="flex items-center gap-1.5 shrink-0">
									{#each (data.calendar?.members || []).slice(0, 4) as m}
										{@const mColor = getEntryMemberColor(m)}
										<span
											class="w-2.5 h-2.5 rounded-full shrink-0 border border-black/15 shadow-2xs"
											style="background-color: {mColor}"
											title="{m.name}"
										></span>
									{/each}
									<span class="w-px h-3 bg-[var(--color-border)] mx-0.5"></span>
									{#each (data.masterVisitCategories || []).slice(0, 3) as cat}
										{@const IconC = getVisitIconComponent(cat.icon)}
										<span class="text-[var(--color-text-secondary)]" title={cat.label}>
											<svelte:component this={IconC} class="w-3 h-3" />
										</span>
									{/each}
								</div>
							</div>
						</div>

						<div class="flex items-center gap-1.5 shrink-0 text-[var(--color-text-secondary)]">
							<span class="text-[11px] font-semibold hidden sm:inline">
								{isLegendOpen ? 'Hide' : 'Show Details'}
							</span>
							<ChevronDown class="w-4 h-4 transition-transform duration-200 {isLegendOpen ? 'rotate-180' : ''}" />
						</div>
					</button>

					{#if isLegendOpen}
						<div class="p-3.5 sm:p-4 border-t border-[var(--color-border)] bg-[var(--color-bg-base)]/50 animate-fadeIn space-y-4">
							<!-- Section A: Main PLO Member Colors -->
							<div>
								<div class="text-[11px] font-extrabold uppercase tracking-wider text-[var(--color-text-secondary)] mb-2 flex items-center gap-1.5">
									<span class="w-2 h-2 rounded-full bg-[var(--color-primary)]"></span>
									<span>PLO Member Colors (Landowner Identification)</span>
								</div>
								<div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
									{#each data.calendar?.members || [] as member}
										{@const memberColor = getEntryMemberColor(member)}
										<div class="flex items-center gap-2 p-2 rounded-xl bg-[var(--color-bg-surface)] border border-[var(--color-border)] shadow-2xs">
											<span class="w-3.5 h-3.5 rounded-full shrink-0 border border-black/15 shadow-2xs" style="background-color: {memberColor}"></span>
											<div class="min-w-0">
												<div class="font-bold text-[var(--color-text-primary)] truncate">{member.name}</div>
												{#if member.portions?.length}
													<div class="text-[10px] text-[var(--color-text-secondary)] truncate">{member.portions[0]}</div>
												{/if}
											</div>
										</div>
									{/each}
								</div>
							</div>

							<!-- Section B: Reasons for Visit (Icons) -->
							<div>
								<div class="text-[11px] font-extrabold uppercase tracking-wider text-[var(--color-text-secondary)] mb-2 flex items-center gap-1.5">
									<Compass class="w-3 h-3 text-purple-600 dark:text-purple-400" />
									<span>Visit Reasons (Icon Encapsulation)</span>
								</div>
								<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-xs">
									{#each data.masterVisitCategories as cat}
										{@const IconComp = getVisitIconComponent(cat.icon)}
										<div class="flex items-start gap-2.5 p-2.5 rounded-xl bg-[var(--color-bg-surface)] border border-[var(--color-border)] shadow-2xs">
											<div class="p-1.5 rounded-lg bg-purple-100 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 shrink-0">
												<svelte:component this={IconComp} class="w-3.5 h-3.5" />
											</div>
											<div class="min-w-0">
												<div class="font-bold text-[var(--color-text-primary)] truncate">{cat.label}</div>
												<div class="text-[10px] text-[var(--color-text-secondary)] line-clamp-1">{cat.description || 'Reserve visit'}</div>
											</div>
										</div>
									{/each}
								</div>
							</div>
						</div>
					{/if}
				</div>

				<!-- 3. Period Heading, Scroller & Views Toggle Card (Full-width on Mobile, Next Card on Desktop) -->
				<div class="w-full lg:flex-1 bg-[var(--color-bg-surface)] rounded-2xl border border-[var(--color-border)] shadow-xs min-h-12 sm:min-h-[52px] p-2 sm:px-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
					<!-- Period Heading ATTACHED to Scroller -->
					<div class="flex items-center justify-between sm:justify-start gap-2 w-full sm:w-auto">
						<div class="flex items-center border border-[var(--color-border)] rounded-xl overflow-hidden bg-[var(--color-bg-base)] shadow-2xs">
							<button
								type="button"
								onclick={prevPeriod}
								aria-label={viewMode === 'week' ? 'Previous week' : 'Previous month'}
								class="p-2 hover:bg-[var(--color-border)]/50 transition-colors text-[var(--color-text-primary)]"
							>
								<ChevronLeft class="w-4 h-4" />
							</button>

							<h2 class="text-xs sm:text-sm font-black text-[var(--color-text-primary)] tabular-nums px-2.5 py-1 text-center min-w-[135px] sm:min-w-[165px] select-none">
								{viewMode === 'week' ? weekRangeLabel : `${monthNames[currentMonth]} ${currentYear}`}
							</h2>

							<button
								type="button"
								onclick={nextPeriod}
								aria-label={viewMode === 'week' ? 'Next week' : 'Next month'}
								class="p-2 hover:bg-[var(--color-border)]/50 transition-colors text-[var(--color-text-primary)]"
							>
								<ChevronRight class="w-4 h-4" />
							</button>
						</div>

						<button
							type="button"
							onclick={jumpToToday}
							class="px-2.5 py-1.5 rounded-xl text-xs font-bold border border-[var(--color-border)] bg-[var(--color-bg-base)] hover:bg-[var(--color-border)]/50 transition-colors text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] shrink-0"
						>
							Today
						</button>
					</div>

					<!-- Views Toggle (Month Grid vs Week View vs Agenda List) -->
					<div class="flex items-center gap-1 p-1 bg-[var(--color-bg-base)] rounded-xl border border-[var(--color-border)] self-stretch sm:self-auto justify-center">
						<button
							type="button"
							onclick={() => (viewMode = 'grid')}
							class="flex-1 sm:flex-initial px-3 py-1 rounded-lg text-xs font-bold transition-all {viewMode === 'grid'
								? 'bg-[var(--color-primary)] text-white shadow-xs'
								: 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'}"
						>
							Month
						</button>
						<button
							type="button"
							onclick={() => (viewMode = 'week')}
							class="flex-1 sm:flex-initial px-3 py-1 rounded-lg text-xs font-bold transition-all {viewMode === 'week'
								? 'bg-[var(--color-primary)] text-white shadow-xs'
								: 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'}"
						>
							Week
						</button>
						<button
							type="button"
							onclick={() => (viewMode = 'agenda')}
							class="flex-1 sm:flex-initial px-3 py-1 rounded-lg text-xs font-bold transition-all {viewMode === 'agenda'
								? 'bg-[var(--color-primary)] text-white shadow-xs'
								: 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'}"
						>
							Agenda
						</button>
					</div>
				</div>
			</div>

			<!-- 1. MONTH GRID VIEW (Default!) -->
			{#if viewMode === 'grid'}
				<div class="bg-[var(--color-bg-surface)] rounded-2xl border border-[var(--color-border)] shadow-sm overflow-hidden w-full max-w-full">
					<div class="grid grid-cols-7 border-b border-[var(--color-border)] text-center text-xs font-bold uppercase text-[var(--color-text-secondary)] bg-[var(--color-bg-base)] py-2 sm:py-3 select-none">
						<div><span class="sm:hidden">S</span><span class="hidden sm:inline">Sun</span></div>
						<div><span class="sm:hidden">M</span><span class="hidden sm:inline">Mon</span></div>
						<div><span class="sm:hidden">T</span><span class="hidden sm:inline">Tue</span></div>
						<div><span class="sm:hidden">W</span><span class="hidden sm:inline">Wed</span></div>
						<div><span class="sm:hidden">T</span><span class="hidden sm:inline">Thu</span></div>
						<div><span class="sm:hidden">F</span><span class="hidden sm:inline">Fri</span></div>
						<div><span class="sm:hidden">S</span><span class="hidden sm:inline">Sat</span></div>
					</div>

					<div class="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-[var(--color-border)] w-full">
						{#each calendarDays as d}
							{@const isSelected = d.dateStr === selectedDayDetails}
							<div
								role="button"
								tabindex={d.day > 0 ? 0 : -1}
								onclick={() => {
									if (d.day > 0) {
										selectedDayDetails = isSelected ? null : d.dateStr;
									}
								}}
								onkeydown={(ev) => {
									if (d.day > 0 && (ev.key === 'Enter' || ev.key === ' ')) {
										ev.preventDefault();
										selectedDayDetails = isSelected ? null : d.dateStr;
									}
								}}
								class="min-h-[56px] sm:min-h-[115px] p-1 sm:p-2 text-left transition-colors flex flex-col justify-between w-full min-w-0 overflow-hidden cursor-pointer {d.isCurrentMonth
									? 'bg-transparent'
									: 'bg-[var(--color-bg-base)]/40 opacity-40'} {isSelected
									? 'ring-2 ring-[var(--color-primary)] bg-[var(--color-primary)]/5'
									: 'hover:bg-[var(--color-border)]/20'}"
							>
								{#if d.day > 0}
									<div class="flex items-center justify-between w-full">
										<span class="text-xs font-bold font-mono {d.dateStr === todayDateStr ? 'px-1.5 py-0.5 rounded-md bg-[var(--color-primary)] text-white' : ''}">{d.day}</span>
										{#if d.entries.length > 0}
											<span class="px-1 py-0.2 rounded text-[9px] sm:text-[10px] font-bold bg-[var(--color-primary)]/10 text-[var(--color-primary)] leading-tight">
												{d.entries.length}
											</span>
										{/if}
									</div>

									<!-- Mobile compact dot markers (< sm) -->
									<div class="flex flex-wrap gap-1 sm:hidden mt-0.5 justify-center py-0.5 w-full">
										{#each d.entries.slice(0, 3) as e: any}
											{@const memberColor = getEntryMemberColor(e)}
											<span class="w-2 h-2 rounded-full shrink-0 border border-black/15 shadow-2xs" style="background-color: {memberColor}" title="{e.member?.name || 'Member'}"></span>
										{/each}
										{#if d.entries.length > 3}
											<span class="text-[8px] text-[var(--color-text-secondary)] font-bold leading-none">+</span>
										{/if}
									</div>

									<!-- Desktop chips (>= sm) -->
									<div class="hidden sm:block space-y-1 mt-1 overflow-hidden w-full">
										{#each d.entries.slice(0, 2) as e: any}
											{@const meta = getCategoryMeta(e.purpose)}
											{@const memberColor = getEntryMemberColor(e)}
											{@const IconComp = getVisitIconComponent(meta.icon)}
											<div
												class="group px-1.5 py-0.5 rounded-lg text-[10px] font-bold flex items-center justify-between gap-1 border shadow-2xs"
												style="border-color: {memberColor}45; background-color: {memberColor}18; color: {memberColor}"
												title={`${e.member?.name || 'Member'} (${meta.label})`}
											>
												<div class="flex items-center gap-1 min-w-0 truncate">
													<svelte:component this={IconComp} class="w-3 h-3 shrink-0" />
													<span class="truncate">{e.member?.name?.split(' ')[0] || 'Member'}</span>
												</div>
												{#if canDeleteEntry(e)}
													<button
														type="button"
														onclick={(ev) => {
															ev.stopPropagation();
															bookingToDelete = e;
														}}
														class="opacity-70 hover:opacity-100 hover:text-rose-600 p-0.5 rounded transition-opacity shrink-0"
														title="Delete entry for {e.member?.name || 'Member'}"
														aria-label="Delete entry for {e.member?.name || 'Member'}"
													>
														<Trash2 class="w-2.5 h-2.5" />
													</button>
												{/if}
											</div>
										{/each}
										{#if d.entries.length > 2}
											<div class="text-[10px] text-[var(--color-text-secondary)] font-medium pl-1">
												+{d.entries.length - 2} more
											</div>
										{/if}
									</div>
								{/if}
							</div>
						{/each}
					</div>
				</div>

				<!-- Selected Day Detail Drawer -->
				{#if selectedDayDetails}
					<div class="p-5 rounded-2xl border border-[var(--color-primary)]/50 bg-[var(--color-bg-surface)] shadow-md space-y-3">
						<div class="flex items-center justify-between border-b border-[var(--color-border)] pb-2">
							<div class="flex items-center gap-2">
								<CalendarIcon class="w-4 h-4 text-[var(--color-primary)]" />
								<h3 class="text-sm font-extrabold text-[var(--color-text-primary)]">
									Scheduled Visits on {formatDateNice(selectedDayDetails)} ({selectedDayDetails})
								</h3>
							</div>
							<button type="button" onclick={() => (selectedDayDetails = null)} class="p-1 rounded-md text-[var(--color-text-secondary)] hover:bg-[var(--color-border)]/40">
								<X class="w-4 h-4" />
							</button>
						</div>

						{#if selectedDayEntries.length === 0}
							<p class="text-xs text-[var(--color-text-secondary)]">
								No reserve visits scheduled for this date.
							</p>
						{:else}
							<div class="grid grid-cols-1 md:grid-cols-2 gap-3">
								{#each selectedDayEntries as e: any}
									{@const meta = getCategoryMeta(e.purpose)}
									{@const memberColor = getEntryMemberColor(e)}
									{@const IconComp = getVisitIconComponent(meta.icon)}
									<div class="p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-base)] space-y-2 shadow-2xs flex items-start justify-between gap-3" style="border-left: 4px solid {memberColor}">
										<div class="space-y-1.5 min-w-0 flex-1">
											<div class="flex flex-wrap items-center gap-2">
												<span class="px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1.5 bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300">
													<svelte:component this={IconComp} class="w-3 h-3 shrink-0" />
													<span>{meta.label}</span>
												</span>
												<span class="text-xs font-mono text-[var(--color-text-secondary)]">
													{e.startDate} → {e.endDate}
												</span>
											</div>
											<div class="font-bold text-xs flex items-center gap-1.5">
												<span class="w-2.5 h-2.5 rounded-full shrink-0 border border-black/15" style="background-color: {memberColor}"></span>
												<span>{e.member?.name} {e.member?.portions?.length ? `• ${e.member.portions.join(', ')}` : ''}</span>
											</div>
											{#if e.notes}
												<div class="text-[11px] text-[var(--color-text-secondary)] italic">
													"{e.notes}"
												</div>
											{/if}
										</div>

										{#if canDeleteEntry(e)}
											<button
												type="button"
												onclick={() => (bookingToDelete = e)}
												class="px-2.5 py-1.5 rounded-lg text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 flex items-center gap-1.5 transition-colors shrink-0"
												title="Delete Calendar Entry"
											>
												<Trash2 class="w-3.5 h-3.5" />
												<span>Delete</span>
											</button>
										{/if}
									</div>
								{/each}
							</div>
						{/if}
					</div>
				{/if}

			<!-- 2. WEEK VIEW -->
			{:else if viewMode === 'week'}
				<div class="bg-[var(--color-bg-surface)] rounded-2xl border border-[var(--color-border)] shadow-sm overflow-hidden w-full">
					<div class="grid grid-cols-1 lg:grid-cols-7 divide-y lg:divide-y-0 lg:divide-x divide-[var(--color-border)]">
						{#each weekDays as wd}
							<div class="flex flex-col min-h-[160px] lg:min-h-[360px] {wd.isToday ? 'bg-[var(--color-primary)]/5' : ''}">
								<!-- Day Column Header -->
								<div class="p-3 border-b border-[var(--color-border)] bg-[var(--color-bg-base)]/80 flex items-center justify-between lg:flex-col lg:items-start gap-1.5">
									<div class="flex items-center gap-2 w-full justify-between">
										<div class="flex items-center gap-1.5">
											<span class="text-[11px] font-extrabold uppercase tracking-wider {wd.isToday ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-secondary)]'}">
												{wd.dayNameShort}
											</span>
											{#if wd.isToday}
												<span class="px-1.5 py-0.2 rounded text-[9px] font-extrabold uppercase bg-[var(--color-primary)] text-white">
													Today
												</span>
											{/if}
										</div>

										<div class="flex items-center gap-1">
											{#if wd.entries.length > 0}
												<span class="px-1.5 py-0.2 rounded-md text-[10px] font-bold bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
													{wd.entries.length} {wd.entries.length === 1 ? 'visit' : 'visits'}
												</span>
											{/if}
											{#if data.calendar.canBook}
												<button
													type="button"
													onclick={() => {
														newStartDate = wd.dateStr;
														newEndDate = wd.dateStr;
														showBookModal = true;
													}}
													class="p-1 rounded-lg hover:bg-[var(--color-border)]/60 text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] transition-colors"
													title="Book visit on {wd.dateStr}"
													aria-label="Book visit on {wd.dateStr}"
												>
													<Plus class="w-3.5 h-3.5" />
												</button>
											{/if}
										</div>
									</div>

									<div class="text-sm font-black font-mono text-[var(--color-text-primary)]">
										{wd.day} {wd.monthShort}
									</div>
								</div>

								<!-- Day Entries List -->
								<div class="p-2.5 space-y-2 flex-1">
									{#if wd.entries.length === 0}
										<div class="h-full min-h-[80px] flex items-center justify-center text-center p-2">
											<span class="text-[11px] text-[var(--color-text-secondary)] opacity-50">No visits</span>
										</div>
									{:else}
										{#each wd.entries as e: any}
											{@const meta = getCategoryMeta(e.purpose)}
											{@const memberColor = getEntryMemberColor(e)}
											{@const IconComp = getVisitIconComponent(meta.icon)}
											<div
												class="p-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-base)] shadow-2xs space-y-1.5 transition-all hover:shadow-sm"
												style="border-left: 4px solid {memberColor}"
											>
												<div class="flex items-start justify-between gap-1.5">
													<div class="flex items-center gap-1.5 min-w-0">
														<span class="w-2.5 h-2.5 rounded-full shrink-0 border border-black/15" style="background-color: {memberColor}"></span>
														<span class="text-xs font-extrabold text-[var(--color-text-primary)] truncate" title={e.member?.name}>
															{e.member?.name}
														</span>
													</div>

													{#if canDeleteEntry(e)}
														<button
															type="button"
															onclick={() => (bookingToDelete = e)}
															class="p-1 rounded-lg text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors shrink-0"
															title="Delete entry for {e.member?.name}"
															aria-label="Delete entry for {e.member?.name}"
														>
															<Trash2 class="w-3.5 h-3.5" />
														</button>
													{/if}
												</div>

												{#if e.member?.portions?.length}
													<div class="text-[10px] text-[var(--color-text-secondary)] font-medium truncate">
														{e.member.portions.join(', ')}
													</div>
												{/if}

												<div class="flex flex-wrap items-center gap-1 pt-0.5">
													<span class="px-1.5 py-0.5 rounded text-[10px] font-bold inline-flex items-center gap-1 bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300">
														<svelte:component this={IconComp} class="w-2.5 h-2.5 shrink-0" />
														<span class="truncate">{meta.label}</span>
													</span>
												</div>

												<div class="text-[10px] font-mono text-[var(--color-text-secondary)] pt-0.5">
													{e.startDate} → {e.endDate}
												</div>

												{#if e.notes}
													<div class="text-[10px] text-[var(--color-text-secondary)] italic line-clamp-2 bg-[var(--color-bg-surface)] p-1.5 rounded-lg border border-[var(--color-border)]/60">
														"{e.notes}"
													</div>
												{/if}
											</div>
										{/each}
									{/if}
								</div>
							</div>
						{/each}
					</div>
				</div>

			<!-- 3. AGENDA TIMELINE VIEW (Current & Upcoming Visits Only) -->
			{:else}
				<div class="space-y-4">
					<!-- Agenda Sub-Filters Bar -->
					<div class="flex flex-wrap items-center justify-between gap-2 bg-[var(--color-bg-surface)] p-3 rounded-2xl border border-[var(--color-border)] shadow-xs">
						<div class="text-xs font-bold text-[var(--color-text-secondary)] flex items-center gap-1.5">
							<Clock class="w-3.5 h-3.5 text-[var(--color-primary)]" />
							<span>Active & Upcoming Schedule</span>
						</div>
						<div class="flex items-center gap-1.5 bg-[var(--color-bg-base)] p-1 rounded-xl border border-[var(--color-border)]">
							<button
								type="button"
								onclick={() => (agendaFilter = 'all')}
								class="px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all {agendaFilter === 'all'
									? 'bg-[var(--color-primary)] text-white shadow-xs'
									: 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'}"
							>
								All ({currentVisits.length + upcomingVisits.length})
							</button>
							<button
								type="button"
								onclick={() => (agendaFilter = 'current')}
								class="px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 {agendaFilter === 'current'
									? 'bg-emerald-600 text-white shadow-xs'
									: 'text-[var(--color-text-secondary)] hover:text-emerald-600'}"
							>
								<span class="w-1.5 h-1.5 rounded-full bg-emerald-500 {agendaFilter === 'current' ? 'bg-white' : ''}"></span>
								Current ({currentVisits.length})
							</button>
							<button
								type="button"
								onclick={() => (agendaFilter = 'upcoming')}
								class="px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 {agendaFilter === 'upcoming'
									? 'bg-blue-600 text-white shadow-xs'
									: 'text-[var(--color-text-secondary)] hover:text-blue-600'}"
							>
								Upcoming ({upcomingVisits.length})
							</button>
						</div>
					</div>

					{#if currentVisits.length === 0 && upcomingVisits.length === 0}
						<!-- Empty State: No current or upcoming visits -->
						<div class="py-12 px-4 text-center text-xs text-[var(--color-text-secondary)] bg-[var(--color-bg-surface)] rounded-2xl border border-[var(--color-border)] space-y-2">
							<CalendarDays class="w-8 h-8 mx-auto text-[var(--color-text-secondary)] opacity-40" />
							<p class="font-bold text-sm text-[var(--color-text-primary)]">No Active or Upcoming Visits</p>
							<p class="max-w-md mx-auto text-[11px]">
								There are currently no members checked into the reserve or scheduled for future stays. Past visits are automatically archived from the agenda list.
							</p>
						</div>
					{:else}
						<!-- SECTION 1: CURRENT VISITS (Active in Reserve Today) -->
						{#if agendaFilter === 'all' || agendaFilter === 'current'}
							<div class="space-y-3">
								<div class="flex items-center justify-between pt-1">
									<div class="flex items-center gap-2">
										<span class="relative flex h-2.5 w-2.5">
											<span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
											<span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
										</span>
										<h3 class="text-xs font-extrabold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
											Current Visits in Reserve
											<span class="px-1.5 py-0.2 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-mono text-[10px]">
												{currentVisits.length}
											</span>
										</h3>
									</div>
									<span class="text-[11px] text-[var(--color-text-secondary)]">Currently on reserve land</span>
								</div>

								{#if currentVisits.length === 0}
									<div class="p-4 rounded-2xl border border-dashed border-emerald-300 dark:border-emerald-900/60 bg-emerald-50/20 dark:bg-emerald-950/10 text-xs text-[var(--color-text-secondary)] flex items-center gap-2.5">
										<Compass class="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
										<span>No landowners or visitors are currently checked into the reserve today.</span>
									</div>
								{:else}
									<div class="space-y-3">
										{#each currentVisits as entry: any}
											{@const meta = getCategoryMeta(entry.purpose)}
											{@const memberColor = getEntryMemberColor(entry)}
											{@const IconComp = getVisitIconComponent(meta.icon)}
											{@const isOwner = entry.userId === data.user.id}
											{@const canCancel = canDeleteEntry(entry)}
											<div class="bg-emerald-50/40 dark:bg-emerald-950/20 p-4 sm:p-5 rounded-2xl border-2 border-emerald-400 dark:border-emerald-700 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4 transition-all" style="border-left: 6px solid {memberColor}">
												<div class="space-y-2 flex-1">
													<div class="flex flex-wrap items-center gap-2">
														<!-- Live Pulse Badge -->
														<span class="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wide bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1.5 shadow-2xs">
															<span class="w-2 h-2 rounded-full bg-emerald-600 dark:bg-emerald-400 animate-pulse"></span>
															In Reserve Now • {getCurrentVisitStatus(entry.startDate, entry.endDate)}
														</span>

														<!-- Category Pill with Icon -->
														<span class="px-2.5 py-1 rounded-md text-xs font-bold flex items-center gap-1.5 bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border border-purple-200 dark:border-purple-800 shadow-2xs">
															<svelte:component this={IconComp} class="w-3.5 h-3.5 shrink-0" />
															<span>{meta.label}</span>
														</span>

														<!-- Dates -->
														<span class="text-xs font-mono font-bold text-[var(--color-text-primary)]">
															{formatDateNice(entry.startDate)} → {formatDateNice(entry.endDate)}
														</span>

														{#if isOwner}
															<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
																Your Booking
															</span>
														{/if}
													</div>

													<div class="flex items-center gap-2">
														<span class="w-3.5 h-3.5 rounded-full shrink-0 border border-black/15 shadow-2xs" style="background-color: {memberColor}"></span>
														<span class="text-base font-extrabold text-[var(--color-text-primary)]">
															{entry.member?.name} {entry.member?.portions?.length ? `• ${entry.member.portions.join(', ')}` : ''}
														</span>
													</div>

													{#if entry.notes}
														<p class="text-xs text-[var(--color-text-secondary)] italic bg-white/70 dark:bg-black/30 p-2.5 rounded-xl border border-emerald-200/50 dark:border-emerald-900/30">
															"{entry.notes}"
														</p>
													{/if}
												</div>

												{#if canCancel}
													<button
														type="button"
														onclick={() => (bookingToDelete = entry)}
														class="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors shrink-0 self-end md:self-center flex items-center gap-1.5 text-xs font-bold"
														title="Delete Booking"
													>
														<Trash2 class="w-4 h-4" />
														<span class="md:hidden">Delete</span>
													</button>
												{/if}
											</div>
										{/each}
									</div>
								{/if}
							</div>
						{/if}

						<!-- SECTION 2: UPCOMING VISITS (Future Bookings) -->
						{#if agendaFilter === 'all' || agendaFilter === 'upcoming'}
							<div class="space-y-3 pt-2">
								<div class="flex items-center justify-between pt-2 border-t border-[var(--color-border)]">
									<div class="flex items-center gap-2">
										<Clock class="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
										<h3 class="text-xs font-extrabold uppercase tracking-wider text-blue-700 dark:text-blue-400 flex items-center gap-1.5">
											Upcoming Visits
											<span class="px-1.5 py-0.2 rounded-md bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 font-mono text-[10px]">
												{upcomingVisits.length}
											</span>
										</h3>
									</div>
									<span class="text-[11px] text-[var(--color-text-secondary)]">Future scheduled stays</span>
								</div>

								{#if upcomingVisits.length === 0}
									<div class="p-4 rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-bg-surface)]/60 text-xs text-[var(--color-text-secondary)] flex items-center gap-2.5">
										<CalendarDays class="w-4 h-4 text-[var(--color-text-secondary)] shrink-0" />
										<span>No upcoming visits scheduled. Use "Book a Visit" to reserve future dates.</span>
									</div>
								{:else}
									<div class="space-y-3">
										{#each upcomingVisits as entry: any}
											{@const meta = getCategoryMeta(entry.purpose)}
											{@const memberColor = getEntryMemberColor(entry)}
											{@const IconComp = getVisitIconComponent(meta.icon)}
											{@const isOwner = entry.userId === data.user.id}
											{@const canCancel = canDeleteEntry(entry)}
											<div class="bg-[var(--color-bg-surface)] p-4 sm:p-5 rounded-2xl border border-[var(--color-border)] shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4 hover:border-blue-400/50 dark:hover:border-blue-600/50 transition-all" style="border-left: 6px solid {memberColor}">
												<div class="space-y-2 flex-1">
													<div class="flex flex-wrap items-center gap-2">
														<!-- Upcoming Countdown Pill -->
														<span class="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide bg-blue-50 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-900 flex items-center gap-1 shadow-2xs">
															<Clock class="w-3 h-3 text-blue-600 dark:text-blue-400" />
															{getUpcomingVisitStatus(entry.startDate)}
														</span>

														<!-- Category Pill with Icon -->
														<span class="px-2.5 py-1 rounded-md text-xs font-bold flex items-center gap-1.5 bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border border-purple-200 dark:border-purple-800 shadow-2xs">
															<svelte:component this={IconComp} class="w-3.5 h-3.5 shrink-0" />
															<span>{meta.label}</span>
														</span>

														<!-- Dates -->
														<span class="text-xs font-mono font-bold text-[var(--color-text-primary)]">
															{formatDateNice(entry.startDate)} → {formatDateNice(entry.endDate)}
														</span>

														{#if isOwner}
															<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
																Your Booking
															</span>
														{/if}
													</div>

													<div class="flex items-center gap-2">
														<span class="w-3.5 h-3.5 rounded-full shrink-0 border border-black/15 shadow-2xs" style="background-color: {memberColor}"></span>
														<span class="text-base font-extrabold text-[var(--color-text-primary)]">
															{entry.member?.name} {entry.member?.portions?.length ? `• ${entry.member.portions.join(', ')}` : ''}
														</span>
													</div>

													{#if entry.notes}
														<p class="text-xs text-[var(--color-text-secondary)] italic bg-[var(--color-bg-base)]/50 p-2.5 rounded-xl border border-[var(--color-border)]">
															"{entry.notes}"
														</p>
													{/if}
												</div>

												{#if canCancel}
													<button
														type="button"
														onclick={() => (bookingToDelete = entry)}
														class="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors shrink-0 self-end md:self-center flex items-center gap-1.5 text-xs font-bold"
														title="Delete Booking"
													>
														<Trash2 class="w-4 h-4" />
														<span class="md:hidden">Delete</span>
													</button>
												{/if}
											</div>
										{/each}
									</div>
								{/if}
							</div>
						{/if}
					{/if}
				</div>
			{/if}
		</div>

	<!-- ========================================================================= -->
	<!-- TAB 2: HUNTING QUOTAS & WANT-TO-BUY REQUESTS                              -->
	<!-- ========================================================================= -->
	{:else if data.isSecretary && activeTab === 'quotas'}
		<div class="space-y-6 animate-fadeIn">
			<!-- Personal Allocations Section -->
			<div class="space-y-3">
				<div class="flex items-center justify-between">
					<h2 class="font-extrabold text-base text-[var(--color-text-primary)] flex items-center gap-2">
						<Crosshair class="w-4 h-4 text-emerald-600" />
						Your Personal Hunting Quota Allocations (2026)
					</h2>
					<span class="text-xs text-[var(--color-text-secondary)]">Calculated from your registered land ownership %</span>
				</div>

				<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
					{#each data.quotas.myAllocations as a}
						{@const rem = Math.max(0, a.allocatedHead - a.huntedHead)}
						{@const pct = a.allocatedHead > 0 ? Math.round((a.huntedHead / a.allocatedHead) * 100) : 0}
						<div class="bg-[var(--color-bg-surface)] p-5 rounded-2xl border border-[var(--color-border)] shadow-sm space-y-3">
							<div class="flex items-center justify-between">
								<div>
									<div class="flex items-center gap-1.5 mb-1 flex-wrap">
										<span class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider {a.quota?.category === 'plo' ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'}">
											{a.quota?.category?.toUpperCase()}
										</span>
										<span class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider {a.quota?.subcategory === 'selling' ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'}">
											{a.quota?.subcategory === 'selling' ? 'Selling' : 'Hunting'}
										</span>
										<span class="text-[10px] text-[var(--color-text-secondary)] font-mono font-semibold">{a.quota?.year}</span>
									</div>
									<h3 class="font-black text-base">{a.quota?.species}</h3>
								</div>
								<span class="px-2.5 py-1 rounded-full text-xs font-black {rem > 0 ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-stone-200 text-stone-700'}">
									{rem} Head Remaining
								</span>
							</div>

							<div class="space-y-1">
								<div class="flex justify-between text-xs text-[var(--color-text-secondary)]">
									<span>Off-Take Progress</span>
									<span class="font-bold">{a.huntedHead} / {a.allocatedHead} ({pct}%)</span>
								</div>
								<div class="w-full bg-[var(--color-border)]/50 h-2 rounded-full overflow-hidden">
									<div class="bg-emerald-600 h-full rounded-full" style="width: {pct}%"></div>
								</div>
							</div>

							<div class="flex items-center justify-between text-xs pt-1 border-t border-[var(--color-border)]">
								<span class="text-[var(--color-text-secondary)]">Official Tariff:</span>
								<span class="font-bold font-mono">{formatZar(a.quota?.unitPriceCents || 0)} / head</span>
							</div>
						</div>
					{:else}
						<div class="col-span-full py-8 text-center text-xs text-[var(--color-text-secondary)] bg-[var(--color-bg-surface)] rounded-2xl border border-[var(--color-border)]">
							No quota allocations assigned to your account for this season.
						</div>
					{/each}
				</div>
			</div>

			<!-- NEW: Peer Landowner Quota Acquisition Requests (Want-to-Buy) -->
			<div class="bg-[var(--color-bg-surface)] rounded-2xl border border-[var(--color-border)] shadow-sm p-6 space-y-4">
				<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[var(--color-border)] pb-3">
					<div>
						<h3 class="font-extrabold text-base text-[var(--color-text-primary)] flex items-center gap-2">
							<ShoppingCart class="w-4 h-4 text-amber-600" />
							Quota Acquisition Requests (Want-to-Buy from Peer PLOs)
						</h3>
						<p class="text-xs text-[var(--color-text-secondary)] mt-0.5">
							Members posting requests for extra hunting off-take from neighboring landowners with surplus quota.
						</p>
					</div>

					<button
						type="button"
						onclick={() => (showBuyRequestModal = true)}
						class="btn bg-amber-600 hover:bg-amber-700 text-white border-0 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs"
					>
						<Plus class="w-4 h-4" />
						Post Want-to-Buy Request
					</button>
				</div>

				<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
					{#each data.quotas.buyRequests as req: any}
						{@const isRequester = req.userId === data.user.id}
						<div class="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-base)] space-y-2.5">
							<div class="flex items-center justify-between">
								<span class="font-black text-sm text-[var(--color-text-primary)]">
									{req.headCount} × {req.species}
								</span>
								<span class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider {req.status === 'open'
									? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
									: req.status === 'fulfilled'
										? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
										: 'bg-stone-200 text-stone-700'}">
									{req.status}
								</span>
							</div>

							<div class="text-xs text-[var(--color-text-secondary)]">
								Requested by: <strong class="text-[var(--color-text-primary)]">{req.requester?.name}</strong>
								{#if req.requesterPortions?.length}
									<span class="text-[10px] block">({req.requesterPortions.join(', ')})</span>
								{/if}
							</div>

							{#if req.offerPriceCents > 0}
								<div class="text-xs font-semibold text-emerald-700 dark:text-emerald-400 font-mono">
									Offering: {formatZar(req.offerPriceCents)} / head
								</div>
							{/if}

							{#if req.notes}
								<div class="text-[11px] text-[var(--color-text-secondary)] italic bg-[var(--color-bg-surface)] p-2 rounded-lg border border-[var(--color-border)]">
									"{req.notes}"
								</div>
							{/if}

							<div class="pt-2 border-t border-[var(--color-border)] flex items-center justify-between gap-2">
								{#if req.status === 'open'}
									{#if isRequester || data.isSecretary}
										<form method="POST" action="?/cancelBuyRequest" use:enhance>
											<input type="hidden" name="requestId" value={req.id} />
											<button
												type="submit"
												class="text-[11px] font-bold text-rose-600 hover:underline flex items-center gap-1"
											>
												<Trash2 class="w-3.5 h-3.5" /> Cancel Request
											</button>
										</form>
									{/if}

									{#if !isRequester}
										<form method="POST" action="?/fulfillBuyRequest" use:enhance>
											<input type="hidden" name="requestId" value={req.id} />
											<button
												type="submit"
												onclick={(e) => {
													if (!confirm(`Confirm you wish to offer/fulfill this request for ${req.headCount} ${req.species} to ${req.requester?.name}?`)) {
														e.preventDefault();
													}
												}}
												class="px-3 py-1 rounded-lg text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white flex items-center gap-1"
											>
												<Handshake class="w-3.5 h-3.5" /> Fulfill / Offer Quota
											</button>
										</form>
									{/if}
								{:else if req.status === 'fulfilled'}
									<div class="text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1">
										<Check class="w-3.5 h-3.5" />
										Fulfilled by {req.fulfilledBy?.name || 'Peer PLO'}
									</div>
								{/if}
							</div>
						</div>
					{:else}
						<div class="col-span-full py-6 text-center text-xs text-[var(--color-text-secondary)]">
							No open quota acquisition requests right now. Click "Post Want-to-Buy Request" to ask other landowners for surplus animals.
						</div>
					{/each}
				</div>
			</div>

			<!-- Reserve Quotas Baseline Table -->
			<div class="bg-[var(--color-bg-surface)] rounded-2xl border border-[var(--color-border)] shadow-sm overflow-hidden">
				<div class="p-4 sm:p-5 border-b border-[var(--color-border)] flex items-center justify-between">
					<div>
						<h3 class="font-extrabold text-base text-[var(--color-text-primary)]">
							Official Reserve Quota Baseline (2026 Season)
						</h3>
						<p class="text-xs text-[var(--color-text-secondary)]">
							Ecological carrying capacity authorized by LEDET and the assembly.
						</p>
					</div>
					<div class="text-xs font-bold font-mono">
						Total Available: {data.quotas.stats.remainingQuota} / {data.quotas.stats.totalQuota} Head
					</div>
				</div>

				<div class="overflow-x-auto">
					<table class="table table-zebra w-full text-left text-sm">
						<thead class="bg-[var(--color-bg-base)] border-b border-[var(--color-border)] text-xs font-bold uppercase text-[var(--color-text-secondary)]">
							<tr>
								<th class="py-3 px-4">Species</th>
								<th class="py-3 px-4">Season</th>
								<th class="py-3 px-4">Category</th>
								<th class="py-3 px-4">Type</th>
								<th class="py-3 px-4 text-center">Total Allowed</th>
								<th class="py-3 px-4 text-right">Tariff (ZAR)</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-[var(--color-border)]">
							{#each data.quotas.list as q}
								<tr class="hover:bg-[var(--color-border)]/20 transition-colors">
									<td class="py-3 px-4 font-bold text-xs">{q.species}</td>
									<td class="py-3 px-4 text-xs font-mono text-[var(--color-text-secondary)]">{q.year}</td>
									<td class="py-3 px-4">
										<span class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase {q.category === 'plo' ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'}">
											{q.category.toUpperCase()}
										</span>
									</td>
									<td class="py-3 px-4">
										<span class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase {q.subcategory === 'selling' ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'}">
											{q.subcategory === 'selling' ? 'Selling' : 'Hunting'}
										</span>
									</td>
									<td class="py-3 px-4 text-center font-mono font-bold text-xs">{q.totalAllocation} Head</td>
									<td class="py-3 px-4 text-right font-mono font-bold text-emerald-600 text-xs">
										{formatZar(q.unitPriceCents)}
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</div>
		</div>

	<!-- ========================================================================= -->
	<!-- TAB 3: WILDLIFE CENSUS                                                    -->
	<!-- ========================================================================= -->
	{:else if data.isSecretary && activeTab === 'census'}
		<div class="space-y-6 animate-fadeIn">
			<!-- Census Stats Strip -->
			<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
				<div class="bg-[var(--color-bg-surface)] p-5 rounded-2xl border border-[var(--color-border)] shadow-sm">
					<div class="text-[11px] font-bold uppercase text-[var(--color-text-secondary)]">Total Wildlife Observed</div>
					<div class="text-2xl font-black text-[var(--color-text-primary)] mt-0.5">{data.census.stats.totalSurveyed} Animals</div>
					<div class="text-[11px] text-[var(--color-text-secondary)]">Surveyed across all monitoring transects</div>
				</div>
				<div class="bg-[var(--color-bg-surface)] p-5 rounded-2xl border border-[var(--color-border)] shadow-sm">
					<div class="text-[11px] font-bold uppercase text-[var(--color-text-secondary)]">Surveyed Species</div>
					<div class="text-2xl font-black text-emerald-600 mt-0.5">{data.census.stats.totalSpecies} Distinct Species</div>
					<div class="text-[11px] text-[var(--color-text-secondary)]">Verified from Master Species Register</div>
				</div>
			</div>

			<!-- Census Log Table -->
			<div class="bg-[var(--color-bg-surface)] rounded-2xl border border-[var(--color-border)] shadow-sm overflow-hidden">
				<div class="p-4 sm:p-5 border-b border-[var(--color-border)] flex items-center justify-between">
					<div>
						<h2 class="font-extrabold text-base text-[var(--color-text-primary)]">
							Historical Wildlife Census Records ({data.census.counts.length})
						</h2>
						<p class="text-xs text-[var(--color-text-secondary)]">
							Ecological surveys conducted in collaboration with LEDET and wildlife specialists.
						</p>
					</div>
				</div>

				<div class="overflow-x-auto">
					<table class="table table-zebra w-full text-left text-sm">
						<thead class="bg-[var(--color-bg-base)] border-b border-[var(--color-border)] text-xs font-bold uppercase text-[var(--color-text-secondary)]">
							<tr>
								<th class="py-3 px-4">Date</th>
								<th class="py-3 px-4">Species</th>
								<th class="py-3 px-4 text-right">Count</th>
								<th class="py-3 px-4">Survey Method</th>
								<th class="py-3 px-4">Observer</th>
								<th class="py-3 px-4">Notes</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-[var(--color-border)]">
							{#each data.census.counts as c}
								<tr class="hover:bg-[var(--color-border)]/20 transition-colors">
									<td class="py-3 px-4 font-mono text-xs whitespace-nowrap">{c.date}</td>
									<td class="py-3 px-4 font-bold text-xs whitespace-nowrap">{c.species}</td>
									<td class="py-3 px-4 text-right font-mono font-black text-emerald-600 text-sm tabular-nums">
										{c.count}
									</td>
									<td class="py-3 px-4 whitespace-nowrap">
										<span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300">
											{c.method.replace('_', ' ')}
										</span>
									</td>
									<td class="py-3 px-4 text-xs whitespace-nowrap">{c.conductedBy}</td>
									<td class="py-3 px-4 text-xs text-[var(--color-text-secondary)] italic max-w-xs truncate">
										{c.notes || '—'}
									</td>
								</tr>
							{:else}
								<tr>
									<td colspan="6" class="py-12 text-center text-xs text-[var(--color-text-secondary)]">
										No game census records entered yet for 2026.
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
<!-- MODAL: BOOK RESERVE VISIT                                                 -->
<!-- ========================================================================= -->
{#if showBookModal}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
		<div class="bg-[var(--color-bg-surface)] border border-[var(--color-border)] rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
			<div class="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
				<div class="flex items-center gap-2">
					<div class="w-8 h-8 rounded-lg bg-[var(--color-primary)] text-white flex items-center justify-center">
						<CalendarIcon class="w-4 h-4" />
					</div>
					<div>
						<h3 class="font-extrabold text-base">Schedule Reserve Visit</h3>
						<p class="text-xs text-[var(--color-text-secondary)]">Coordinate field presence & safety</p>
					</div>
				</div>
				<button type="button" onclick={() => (showBookModal = false)} class="p-1.5 rounded-lg hover:bg-[var(--color-border)]/40">
					<X class="w-4 h-4" />
				</button>
			</div>

			<form
				method="POST"
				action="?/createBooking"
				use:enhance={() => {
					isSubmittingBooking = true;
					return async ({ result, update }) => {
						isSubmittingBooking = false;
						if (result.type === 'success') {
							showBookModal = false;
						}
						await update();
					};
				}}
				class="space-y-4"
			>
				{#if data.isSecretary}
					<div class="space-y-1">
						<label class="text-xs font-bold text-[var(--color-text-secondary)]">Target Landowner</label>
						<select name="targetUserId" bind:value={newTargetUserId} class="select select-bordered select-sm w-full text-xs">
							{#each data.calendar.members as m}
								<option value={m.id}>{m.name} ({m.portions.join(', ') || 'No Portion'})</option>
							{/each}
						</select>
					</div>
				{/if}

				<div class="grid grid-cols-2 gap-3">
					<div class="space-y-1">
						<label class="text-xs font-bold text-[var(--color-text-secondary)]">Start Date</label>
						<input type="date" name="startDate" required bind:value={newStartDate} class="input input-bordered input-sm w-full text-xs font-mono" />
					</div>
					<div class="space-y-1">
						<label class="text-xs font-bold text-[var(--color-text-secondary)]">End Date</label>
						<input type="date" name="endDate" required bind:value={newEndDate} class="input input-bordered input-sm w-full text-xs font-mono" />
					</div>
				</div>

				<div class="space-y-1">
					<label class="text-xs font-bold text-[var(--color-text-secondary)]">Visit Purpose Category</label>
					<select name="purpose" bind:value={newPurpose} class="select select-bordered select-sm w-full text-xs font-medium">
						{#each data.masterVisitCategories as cat}
							<option value={cat.key}>{cat.label} ({cat.description})</option>
						{/each}
					</select>
				</div>

				<div class="space-y-1">
					<label class="text-xs font-bold text-[var(--color-text-secondary)]">Notes / Accommodation Camp</label>
					<input type="text" name="notes" placeholder="e.g. Kruispad Camp, 2 guests" bind:value={newNotes} class="input input-bordered input-sm w-full text-xs" />
				</div>

				<div class="flex justify-end gap-2 pt-2 border-t border-[var(--color-border)]">
					<button type="button" onclick={() => (showBookModal = false)} class="px-4 py-2 rounded-xl text-xs font-bold border border-[var(--color-border)]">Cancel</button>
					<button type="submit" disabled={isSubmittingBooking} class="btn bg-[var(--color-primary)] text-white border-0 text-xs font-bold px-4 py-2 rounded-xl">
						{isSubmittingBooking ? 'Saving...' : 'Confirm Booking'}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- ========================================================================= -->
<!-- MODAL: POST WANT-TO-BUY ACQUISITION REQUEST                               -->
<!-- ========================================================================= -->
{#if showBuyRequestModal}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
		<div class="bg-[var(--color-bg-surface)] border border-[var(--color-border)] rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
			<div class="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
				<div class="flex items-center gap-2">
					<div class="w-8 h-8 rounded-lg bg-amber-600 text-white flex items-center justify-center">
						<ShoppingCart class="w-4 h-4" />
					</div>
					<div>
						<h3 class="font-extrabold text-base">Post Want-to-Buy Quota Request</h3>
						<p class="text-xs text-[var(--color-text-secondary)]">Request animals for hunting from peer landowners</p>
					</div>
				</div>
				<button type="button" onclick={() => (showBuyRequestModal = false)} class="p-1.5 rounded-lg hover:bg-[var(--color-border)]/40">
					<X class="w-4 h-4" />
				</button>
			</div>

			<form
				method="POST"
				action="?/createBuyRequest"
				use:enhance={() => {
					return async ({ result, update }) => {
						if (result.type === 'success') {
							showBuyRequestModal = false;
						}
						await update();
					};
				}}
				class="space-y-4"
			>
				<!-- Species selection from Master Species Register -->
				<div class="space-y-1">
					<label class="text-xs font-bold text-[var(--color-text-secondary)]">Target Species (from Master Register)</label>
					<select name="species" bind:value={buySpecies} class="select select-bordered select-sm w-full text-xs font-bold">
						{#each data.masterSpecies as sp}
							<option value={sp.name}>{sp.name} ({sp.category.replace('_', ' ')})</option>
						{/each}
					</select>
				</div>

				<div class="grid grid-cols-2 gap-3">
					<div class="space-y-1">
						<label class="text-xs font-bold text-[var(--color-text-secondary)]">Head Count</label>
						<input type="number" name="headCount" min="1" required bind:value={buyHeadCount} class="input input-bordered input-sm w-full text-xs font-mono font-bold" />
					</div>

					<div class="space-y-1">
						<label class="text-xs font-bold text-[var(--color-text-secondary)]">Offer Price per Head (ZAR)</label>
						<div class="relative">
							<span class="absolute left-3 top-2 text-xs font-bold text-[var(--color-text-secondary)]">R</span>
							<input type="number" name="offerPriceZar" min="0" step="100" bind:value={buyOfferZar} class="input input-bordered input-sm w-full pl-7 text-xs font-mono font-bold" placeholder="8500" />
						</div>
					</div>
				</div>

				<div class="space-y-1">
					<label class="text-xs font-bold text-[var(--color-text-secondary)]">Excursion Purpose & Timing</label>
					<input type="text" name="notes" placeholder="e.g. Planning a weekend hunt with family in late July, need extra kudu" bind:value={buyNotes} class="input input-bordered input-sm w-full text-xs" />
				</div>

				<div class="flex justify-end gap-2 pt-2 border-t border-[var(--color-border)]">
					<button type="button" onclick={() => (showBuyRequestModal = false)} class="px-4 py-2 rounded-xl text-xs font-bold border border-[var(--color-border)]">Cancel</button>
					<button type="submit" class="btn bg-amber-600 hover:bg-amber-700 text-white border-0 text-xs font-bold px-4 py-2 rounded-xl">
						Publish Request to PLOs
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- ========================================================================= -->
<!-- MODAL: LOG HUNTING OFF-TAKE                                               -->
<!-- ========================================================================= -->
{#if showHuntModal}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
		<div class="bg-[var(--color-bg-surface)] border border-[var(--color-border)] rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
			<div class="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
				<div class="flex items-center gap-2">
					<div class="w-8 h-8 rounded-lg bg-emerald-700 text-white flex items-center justify-center">
						<Crosshair class="w-4 h-4" />
					</div>
					<div>
						<h3 class="font-extrabold text-base">Log Biological Hunting Off-Take</h3>
						<p class="text-xs text-[var(--color-text-secondary)]">Immediate balance deduction from quota</p>
					</div>
				</div>
				<button type="button" onclick={() => (showHuntModal = false)} class="p-1.5 rounded-lg hover:bg-[var(--color-border)]/40">
					<X class="w-4 h-4" />
				</button>
			</div>

			<form
				method="POST"
				action="?/logHunt"
				use:enhance={() => {
					return async ({ result, update }) => {
						if (result.type === 'success') {
							showHuntModal = false;
						}
						await update();
					};
				}}
				class="space-y-4"
			>
				<div class="space-y-1">
					<label class="text-xs font-bold text-[var(--color-text-secondary)]">Target Quota Species</label>
					<select name="quotaId" bind:value={selectedQuotaId} class="select select-bordered select-sm w-full text-xs font-bold">
						{#each data.quotas.myAllocations as alloc}
							{@const rem = Math.max(0, alloc.allocatedHead - alloc.huntedHead)}
							<option value={alloc.quotaId}>{alloc.quota?.species} ({rem} Head Remaining)</option>
						{/each}
					</select>
				</div>

				<div class="grid grid-cols-2 gap-3">
					<div class="space-y-1">
						<label class="text-xs font-bold text-[var(--color-text-secondary)]">Head Count</label>
						<input type="number" name="headCount" min="1" required bind:value={huntHeadCount} class="input input-bordered input-sm w-full text-xs font-mono font-bold" />
					</div>
					<div class="space-y-1">
						<label class="text-xs font-bold text-[var(--color-text-secondary)]">Date</label>
						<input type="date" name="date" required bind:value={huntDate} class="input input-bordered input-sm w-full text-xs font-mono" />
					</div>
				</div>

				<div class="grid grid-cols-2 gap-3">
					<div class="space-y-1">
						<label class="text-xs font-bold text-[var(--color-text-secondary)]">Hunter Name</label>
						<input type="text" name="hunterName" required bind:value={hunterName} class="input input-bordered input-sm w-full text-xs" />
					</div>
					<div class="space-y-1">
						<label class="text-xs font-bold text-[var(--color-text-secondary)]">Firearm Caliber</label>
						<input type="text" name="firearmCaliber" bind:value={firearmCaliber} class="input input-bordered input-sm w-full text-xs" />
					</div>
				</div>

				<div class="space-y-1">
					<label class="text-xs font-bold text-[var(--color-text-secondary)]">Field Notes / Camp</label>
					<input type="text" name="notes" placeholder="e.g. Mature bull, clean vitals shot" bind:value={huntNotes} class="input input-bordered input-sm w-full text-xs" />
				</div>

				<div class="flex justify-end gap-2 pt-2 border-t border-[var(--color-border)]">
					<button type="button" onclick={() => (showHuntModal = false)} class="px-4 py-2 rounded-xl text-xs font-bold border border-[var(--color-border)]">Cancel</button>
					<button type="submit" class="btn bg-emerald-700 text-white border-0 text-xs font-bold px-4 py-2 rounded-xl">
						Commit Off-Take Record
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- ========================================================================= -->
<!-- MODAL: RECORD GAME CENSUS (Species Selectable from Master List)            -->
<!-- ========================================================================= -->
{#if showCensusModal}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
		<div class="bg-[var(--color-bg-surface)] border border-[var(--color-border)] rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
			<div class="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
				<div class="flex items-center gap-2">
					<div class="w-8 h-8 rounded-lg bg-amber-700 text-white flex items-center justify-center">
						<Binoculars class="w-4 h-4" />
					</div>
					<div>
						<h3 class="font-extrabold text-base">Record Game Census Count</h3>
						<p class="text-xs text-[var(--color-text-secondary)]">Ecological monitoring record</p>
					</div>
				</div>
				<button type="button" onclick={() => (showCensusModal = false)} class="p-1.5 rounded-lg hover:bg-[var(--color-border)]/40">
					<X class="w-4 h-4" />
				</button>
			</div>

			<form
				method="POST"
				action="?/recordGameCount"
				use:enhance={() => {
					return async ({ result, update }) => {
						if (result.type === 'success') {
							showCensusModal = false;
						}
						await update();
					};
				}}
				class="space-y-4"
			>
				<div class="grid grid-cols-2 gap-3">
					<!-- Species selection from Master Species Register -->
					<div class="space-y-1">
						<label class="text-xs font-bold text-[var(--color-text-secondary)]">Species (from Master Register)</label>
						<select name="species" bind:value={censusSpecies} class="select select-bordered select-sm w-full text-xs font-bold">
							{#each data.masterSpecies as sp}
								<option value={sp.name}>{sp.name}</option>
							{/each}
						</select>
					</div>
					<div class="space-y-1">
						<label class="text-xs font-bold text-[var(--color-text-secondary)]">Observed Count</label>
						<input type="number" name="count" min="0" required bind:value={censusCount} class="input input-bordered input-sm w-full text-xs font-mono font-bold" />
					</div>
				</div>

				<div class="grid grid-cols-2 gap-3">
					<div class="space-y-1">
						<label class="text-xs font-bold text-[var(--color-text-secondary)]">Survey Method</label>
						<select name="method" bind:value={censusMethod} class="select select-bordered select-sm w-full text-xs font-medium">
							<option value="ground_transect">Ground Vehicle Transect</option>
							<option value="aerial_helicopter">Aerial Helicopter Survey</option>
							<option value="waterhole_census">Waterhole Stationary Census</option>
						</select>
					</div>
					<div class="space-y-1">
						<label class="text-xs font-bold text-[var(--color-text-secondary)]">Survey Date</label>
						<input type="date" name="date" required bind:value={censusDate} class="input input-bordered input-sm w-full text-xs font-mono" />
					</div>
				</div>

				<div class="space-y-1">
					<label class="text-xs font-bold text-[var(--color-text-secondary)]">Conducted / Observed By</label>
					<input type="text" name="conductedBy" required bind:value={censusObserver} class="input input-bordered input-sm w-full text-xs" />
				</div>

				<div class="space-y-1">
					<label class="text-xs font-bold text-[var(--color-text-secondary)]">Ecological Notes</label>
					<input type="text" name="notes" placeholder="e.g. Healthy herd composition near Kruispad pan" bind:value={censusNotes} class="input input-bordered input-sm w-full text-xs" />
				</div>

				<div class="flex justify-end gap-2 pt-2 border-t border-[var(--color-border)]">
					<button type="button" onclick={() => (showCensusModal = false)} class="px-4 py-2 rounded-xl text-xs font-bold border border-[var(--color-border)]">Cancel</button>
					<button type="submit" class="btn bg-amber-700 text-white border-0 text-xs font-bold px-4 py-2 rounded-xl">
						Save Census Record
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- ========================================================================= -->
<!-- MODAL: CONFIRM DELETE CALENDAR ENTRY                                      -->
<!-- ========================================================================= -->
{#if bookingToDelete}
	{@const delMeta = getCategoryMeta(bookingToDelete.purpose)}
	{@const delMemberColor = getEntryMemberColor(bookingToDelete)}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
		<div class="bg-[var(--color-bg-surface)] border border-[var(--color-border)] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
			<div class="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
				<div class="flex items-center gap-2.5">
					<div class="w-8 h-8 rounded-lg bg-rose-600 text-white flex items-center justify-center shrink-0">
						<AlertTriangle class="w-4 h-4" />
					</div>
					<div>
						<h3 class="font-extrabold text-base text-[var(--color-text-primary)]">Delete Calendar Entry</h3>
						<p class="text-xs text-[var(--color-text-secondary)]">Please confirm permanent removal</p>
					</div>
				</div>
				<button type="button" onclick={() => (bookingToDelete = null)} class="p-1.5 rounded-lg hover:bg-[var(--color-border)]/40">
					<X class="w-4 h-4" />
				</button>
			</div>

			<p class="text-xs text-[var(--color-text-secondary)] leading-relaxed">
				Are you sure you want to delete this calendar entry for <strong class="text-[var(--color-text-primary)]">{bookingToDelete.member?.name || 'this member'}</strong>? This action will permanently remove the scheduled stay from the reserve calendar.
			</p>

			<div class="p-3.5 rounded-xl bg-[var(--color-bg-base)] border border-[var(--color-border)] space-y-2 text-xs" style="border-left: 4px solid {delMemberColor}">
				<div class="flex items-center justify-between gap-2">
					<span class="text-[var(--color-text-secondary)]">PLO Member:</span>
					<span class="font-bold text-[var(--color-text-primary)] flex items-center gap-1.5">
						<span class="w-2.5 h-2.5 rounded-full shrink-0 border border-black/15" style="background-color: {delMemberColor}"></span>
						{bookingToDelete.member?.name}
						{#if bookingToDelete.member?.portions?.length}
							<span class="text-[11px] font-normal text-[var(--color-text-secondary)]">({bookingToDelete.member.portions.join(', ')})</span>
						{/if}
					</span>
				</div>
				<div class="flex items-center justify-between gap-2">
					<span class="text-[var(--color-text-secondary)]">Scheduled Dates:</span>
					<span class="font-mono font-bold text-[var(--color-text-primary)]">
						{formatDateNice(bookingToDelete.startDate)} → {formatDateNice(bookingToDelete.endDate)}
					</span>
				</div>
				<div class="flex items-center justify-between gap-2">
					<span class="text-[var(--color-text-secondary)]">Visit Category:</span>
					<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300">
						{delMeta.label}
					</span>
				</div>
				{#if bookingToDelete.notes}
					<div class="pt-1.5 border-t border-[var(--color-border)] text-[11px] text-[var(--color-text-secondary)] italic">
						"{bookingToDelete.notes}"
					</div>
				{/if}
			</div>

			<form
				method="POST"
				action="?/cancelBooking"
				use:enhance={() => {
					isDeletingBooking = true;
					return async ({ result, update }) => {
						isDeletingBooking = false;
						if (result.type === 'success') {
							bookingToDelete = null;
						}
						await update();
					};
				}}
			>
				<input type="hidden" name="id" value={bookingToDelete.id} />

				<div class="flex justify-end gap-2 pt-2 border-t border-[var(--color-border)]">
					<button
						type="button"
						onclick={() => (bookingToDelete = null)}
						disabled={isDeletingBooking}
						class="px-4 py-2 rounded-xl text-xs font-bold border border-[var(--color-border)] hover:bg-[var(--color-border)]/40 transition-colors"
					>
						Cancel
					</button>
					<button
						type="submit"
						disabled={isDeletingBooking}
						class="btn bg-rose-600 hover:bg-rose-700 text-white border-0 text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5"
					>
						<Trash2 class="w-3.5 h-3.5" />
						<span>{isDeletingBooking ? 'Deleting...' : 'Confirm & Delete'}</span>
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}
