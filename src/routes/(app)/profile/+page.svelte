<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData, ActionData } from './$types';
	import {
		User,
		Mail,
		Shield,
		Landmark,
		Sun,
		Moon,
		LogOut,
		CheckCircle2,
		MapPin,
		Calendar,
		ArrowLeft,
		Sparkles,
		Tag,
		Vote,
		TreePine,
		Smartphone,
		Download,
		Share2,
		X,
		Plus,
		Users,
		UserPlus,
		Send,
		Clock,
		Trash2,
		RotateCw,
		AlertCircle,
		ShieldCheck
	} from 'lucide-svelte';

	let { data, form }: { data: PageData; form?: ActionData } = $props();

	let inviteEmail = $state('');
	let inviteName = $state('');
	let inviteRelationship = $state('family');
	let isSendingInvite = $state(false);
	let actionInProgress = $state<string | null>(null);

	function getDaysUntil(date: Date | string | number): string {
		const diff = new Date(date).getTime() - Date.now();
		const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
		if (days <= 0) return 'Expired';
		if (days === 1) return 'Expires tomorrow';
		return `Expires in ${days} days`;
	}

	let currentTheme = $state('light');
	let isStandalone = $state(false);
	let deferredPrompt = $state<any>(null);
	let isInstalled = $state(false);
	let showInstallModal = $state(false);
	let modalType = $state<'ios' | 'mac_safari' | 'chrome_manual' | 'android_manual' | 'already_installed'>('ios');
	let isIos = $state(false);
	let isAndroid = $state(false);
	let isSafari = $state(false);
	let isChrome = $state(false);

	$effect(() => {
		try {
			const saved = localStorage.getItem('acnrplo-theme');
			if (saved === 'dark' || saved === 'light') {
				currentTheme = saved;
			} else {
				const attr = document.documentElement.getAttribute('data-theme');
				if (attr) currentTheme = attr;
			}
		} catch {}

		if (typeof window !== 'undefined') {
			isStandalone =
				window.matchMedia('(display-mode: standalone)').matches ||
				(navigator as any).standalone === true;

			const ua = window.navigator.userAgent.toLowerCase();
			isIos = /iphone|ipad|ipod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
			isAndroid = /android/.test(ua);
			isSafari = /safari/.test(ua) && !/chrome|chromium|edg|opr|crios|fxios/.test(ua);
			isChrome = /chrome|chromium|crios/.test(ua) && !/edg|opr/.test(ua);

			// Check if prompt was captured on window
			if ((window as any).__acnrploInstallPrompt) {
				deferredPrompt = (window as any).__acnrploInstallPrompt;
			}

			const handleBeforeInstall = (e: Event) => {
				e.preventDefault();
				deferredPrompt = e;
				(window as any).__acnrploInstallPrompt = e;
			};
			window.addEventListener('beforeinstallprompt', handleBeforeInstall);

			const handleAppInstalled = () => {
				isInstalled = true;
				isStandalone = true;
				deferredPrompt = null;
				if (typeof window !== 'undefined') {
					(window as any).__acnrploInstallPrompt = null;
				}
				showInstallModal = false;
			};
			window.addEventListener('appinstalled', handleAppInstalled);

			return () => {
				window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
				window.removeEventListener('appinstalled', handleAppInstalled);
			};
		}
	});

	async function handleInstallClick() {
		if (isStandalone || isInstalled) {
			modalType = 'already_installed';
			showInstallModal = true;
			return;
		}

		const promptEvent = deferredPrompt || (typeof window !== 'undefined' ? (window as any).__acnrploInstallPrompt : null);

		if (promptEvent) {
			try {
				promptEvent.prompt();
				const choice = await promptEvent.userChoice;
				if (choice?.outcome === 'accepted') {
					isInstalled = true;
					isStandalone = true;
					deferredPrompt = null;
					if (typeof window !== 'undefined') {
						(window as any).__acnrploInstallPrompt = null;
					}
					return;
				}
			} catch (err) {
				console.error('Install prompt error:', err);
			}
		}

		if (isIos) {
			modalType = 'ios';
			showInstallModal = true;
			return;
		}

		if (isSafari && !isIos) {
			modalType = 'mac_safari';
			showInstallModal = true;
			return;
		}

		if (isAndroid) {
			modalType = 'android_manual';
			showInstallModal = true;
			return;
		}

		modalType = 'chrome_manual';
		showInstallModal = true;
	}

	function setTheme(theme: 'light' | 'dark') {
		currentTheme = theme;
		document.documentElement.setAttribute('data-theme', theme);
		try {
			localStorage.setItem('acnrplo-theme', theme);
		} catch {}
	}

	const isSecretary = $derived(data.user?.roles?.includes('secretary'));
	const returnUrl = $derived(isSecretary ? '/dashboard' : '/operations?tab=calendar');

	function getInitials(name: string = ''): string {
		return name
			.split(' ')
			.map((n) => n[0])
			.filter(Boolean)
			.slice(0, 2)
			.join('')
			.toUpperCase();
	}
</script>

<svelte:head>
	<title>Member Profile & Account — ACNRPLO</title>
</svelte:head>

<div class="space-y-6 max-w-4xl mx-auto pb-16">
	<!-- Top Navigation Breadcrumb & Header -->
	<div class="flex items-center justify-between gap-4">
		<a
			href={returnUrl}
			class="inline-flex items-center gap-2 text-xs font-bold text-[var(--color-primary)] hover:underline px-3 py-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-surface)] shadow-xs transition-colors"
		>
			<ArrowLeft class="w-4 h-4" />
			<span>Return to {isSecretary ? 'Reserve Cockpit' : 'Shared Calendar'}</span>
		</a>

		<span class="text-[11px] font-mono text-[var(--color-text-secondary)] font-medium">
			ACNRPLO Member Roll
		</span>
	</div>

	<!-- 1. Member Identity Card -->
	<div class="bg-[var(--color-bg-surface)] border border-[var(--color-border)] rounded-2xl p-5 sm:p-7 shadow-sm space-y-6">
		<div class="flex flex-col sm:flex-row sm:items-center gap-5">
			<!-- Large Avatar Circle -->
			<div class="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-[var(--color-primary)] text-white flex items-center justify-center font-black text-xl sm:text-2xl shadow-md shrink-0">
				{getInitials(data.user.name)}
			</div>

			<div class="space-y-1.5 flex-1 min-w-0">
				<div class="flex flex-wrap items-center gap-2">
					<h1 class="text-xl sm:text-2xl font-black text-[var(--color-text-primary)] truncate">
						{data.user.name}
					</h1>
					<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
						<CheckCircle2 class="w-3 h-3" />
						Verified Member
					</span>
				</div>

				<div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--color-text-secondary)]">
					<div class="flex items-center gap-1.5">
						<Mail class="w-3.5 h-3.5 text-stone-400" />
						<span class="font-mono">{data.user.email}</span>
					</div>
					{#if data.user.username}
						<div class="flex items-center gap-1.5">
							<span class="text-stone-400 font-bold">@</span>
							<span class="font-mono">{data.user.username}</span>
						</div>
					{/if}
				</div>

				<div class="flex flex-wrap gap-1.5 pt-1">
					{#each data.user.roles as role}
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
		</div>
	</div>

	<!-- 2. Cadastral Portion & Ownership Share Card -->
	<div class="bg-[var(--color-bg-surface)] border border-[var(--color-border)] rounded-2xl p-5 sm:p-7 shadow-sm space-y-5">
		<div class="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
			<div class="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-[var(--color-primary)]">
				<Landmark class="w-4 h-4" />
				<span>Cadastral Portion & Voting Equity</span>
			</div>
			<span class="text-[11px] font-mono text-[var(--color-text-secondary)]">
				Total Reserve: 10,000 bps (100.00%)
			</span>
		</div>

		{#if data.portions.length > 0}
			<!-- Registered Land Portion Details -->
			<div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
				<!-- Portion Name -->
				<div class="bg-[var(--color-bg-base)] p-4 rounded-xl border border-[var(--color-border)] space-y-1">
					<div class="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-secondary)] flex items-center gap-1.5">
						<MapPin class="w-3.5 h-3.5 text-[var(--color-primary)]" />
						<span>Cadastral Portion</span>
					</div>
					<div class="text-xl font-black text-[var(--color-text-primary)]">
						{data.portions.map(p => p.portionName).join(', ')}
					</div>
					<div class="text-[11px] text-[var(--color-text-secondary)]">
						{data.portions.length} registered survey title{data.portions.length > 1 ? 's' : ''}
					</div>
				</div>

				<!-- Ownership Percentage -->
				<div class="bg-[var(--color-bg-base)] p-4 rounded-xl border border-[var(--color-border)] space-y-1">
					<div class="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-secondary)] flex items-center gap-1.5">
						<Sparkles class="w-3.5 h-3.5 text-amber-600" />
						<span>Reserve Ownership</span>
					</div>
					<div class="text-2xl font-black text-[var(--color-secondary)] font-mono">
						{data.stats.totalPercentage.toFixed(2)}%
					</div>
					<div class="text-[11px] text-[var(--color-text-secondary)]">
						{data.stats.totalHectares.toLocaleString('en-ZA')} surveyed hectares
					</div>
				</div>

				<!-- Voting Weight Basis Points -->
				<div class="bg-[var(--color-bg-base)] p-4 rounded-xl border border-[var(--color-border)] space-y-1">
					<div class="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-secondary)] flex items-center gap-1.5">
						<Vote class="w-3.5 h-3.5 text-indigo-600" />
						<span>Voting Power</span>
					</div>
					<div class="text-2xl font-black text-[var(--color-primary)] font-mono">
						{data.stats.totalVoteBps} bps
					</div>
					<div class="text-[11px] text-[var(--color-text-secondary)]">
						Share-weighted governance ballots
					</div>
				</div>
			</div>

			<!-- Visual Ownership Proportion Bar -->
			<div class="space-y-1.5 bg-[var(--color-bg-base)] p-4 rounded-xl border border-[var(--color-border)]">
				<div class="flex justify-between text-xs font-semibold">
					<span class="text-[var(--color-text-secondary)]">Reserve Share Representation:</span>
					<span class="font-mono text-[var(--color-primary)] font-bold">{data.stats.totalPercentage.toFixed(2)}% of 100.00%</span>
				</div>
				<div class="w-full bg-[var(--color-border)]/60 h-3 rounded-full overflow-hidden">
					<div
						class="h-full bg-[var(--color-secondary)] rounded-full transition-all duration-500"
						style="width: {Math.max(data.stats.totalPercentage, 2)}%"
					></div>
				</div>
			</div>

			<!-- Detailed Portions Table (if multiple or notes present) -->
			<div class="space-y-2">
				<div class="text-xs font-bold text-[var(--color-text-secondary)] uppercase tracking-wider">
					Portion Survey Breakdown
				</div>
				<div class="overflow-x-auto rounded-xl border border-[var(--color-border)]">
					<table class="w-full text-left text-xs">
						<thead class="bg-[var(--color-bg-base)] text-[var(--color-text-secondary)] font-bold uppercase text-[10px] border-b border-[var(--color-border)]">
							<tr>
								<th class="py-2.5 px-3.5">Portion Name</th>
								<th class="py-2.5 px-3.5 text-right">Hectares</th>
								<th class="py-2.5 px-3.5 text-right">Ownership Share</th>
								<th class="py-2.5 px-3.5 text-right">Voting Weight</th>
								<th class="py-2.5 px-3.5">Status</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-[var(--color-border)] bg-[var(--color-bg-surface)]">
							{#each data.portions as p}
								<tr>
									<td class="py-2.5 px-3.5 font-bold">{p.portionName}</td>
									<td class="py-2.5 px-3.5 text-right font-mono">{p.hectares.toLocaleString('en-ZA')} ha</td>
									<td class="py-2.5 px-3.5 text-right font-mono font-bold text-[var(--color-secondary)]">{(p.ownershipBps / 100).toFixed(2)}%</td>
									<td class="py-2.5 px-3.5 text-right font-mono">{p.voteAllocationBps} bps</td>
									<td class="py-2.5 px-3.5">
										<span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
											{p.status}
										</span>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</div>
		{:else}
			<!-- Secretary / Non-portion Holder Information -->
			<div class="p-4 rounded-xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/50 space-y-2 text-xs">
				<div class="flex items-center gap-2 font-bold text-purple-900 dark:text-purple-200 text-sm">
					<Shield class="w-4 h-4 text-purple-700 dark:text-purple-400" />
					<span>Secretary Administration Account</span>
				</div>
				<p class="text-purple-800 dark:text-purple-300 leading-relaxed">
					This account holds administrative executive authority under the reserve constitution without direct cadastral land portion ownership (<strong>0.00% / 0 bps</strong>). Voting ballots on property resolutions are reserved for registered private land owners.
				</p>
			</div>
		{/if}
	</div>

	<!-- 3. Profile Members & Associate Invitations (Main PLO & Secretary) -->
	{#if data.canInvite}
		<div class="bg-[var(--color-bg-surface)] border border-[var(--color-border)] rounded-2xl p-5 sm:p-7 shadow-sm space-y-6">
			<div class="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
				<div class="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-[var(--color-primary)]">
					<Users class="w-4 h-4" />
					<span>Profile Members &amp; Associate Invitations</span>
				</div>
				<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300">
					<span>{data.associates.length} Active</span>
					<span>•</span>
					<span>{data.pendingInvitations.length} Pending</span>
				</span>
			</div>

			<p class="text-xs text-[var(--color-text-secondary)] leading-relaxed">
				Invite family members, co-owners, or delegates to your cadastral profile. When you add their email, the app sends an invitation link via Cloudflare Email Service from <strong>dialogdev.net</strong> where they set a password to log into the reserve portal.
			</p>

			<!-- Action Feedback Alerts -->
			{#if form?.message}
				<div class="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-200 flex items-start gap-2.5">
					<CheckCircle2 class="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
					<div class="space-y-0.5">
						<div class="font-bold">Invitation Successful</div>
						<p class="opacity-90">{form.message}</p>
					</div>
				</div>
			{/if}

			{#if form?.error}
				<div class="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-200 flex items-start gap-2.5">
					<AlertCircle class="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
					<div class="space-y-0.5">
						<div class="font-bold">Error</div>
						<p class="opacity-90">{form.error}</p>
					</div>
				</div>
			{/if}

			<!-- Invite New Member Form -->
			<div class="bg-[var(--color-bg-base)] p-4 sm:p-5 rounded-xl border border-[var(--color-border)] space-y-4">
				<div class="flex items-center gap-2 text-xs font-bold text-[var(--color-text-primary)] uppercase tracking-wider">
					<UserPlus class="w-4 h-4 text-[var(--color-primary)]" />
					<span>Invite a Member to Your Profile</span>
				</div>

				<form
					method="POST"
					action="?/inviteMember"
					use:enhance={() => {
						isSendingInvite = true;
						return async ({ update }) => {
							isSendingInvite = false;
							await update();
							if (form?.success) {
								inviteEmail = '';
								inviteName = '';
								inviteRelationship = 'family';
							}
						};
					}}
					class="space-y-3"
				>
					<div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
						<!-- Email Address -->
						<div class="space-y-1">
							<label for="invite-email" class="text-[11px] font-bold text-[var(--color-text-secondary)] uppercase tracking-wider block">
								Member Email <span class="text-rose-500">*</span>
							</label>
							<div class="relative">
								<div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
									<Mail class="w-3.5 h-3.5" />
								</div>
								<input
									id="invite-email"
									type="email"
									name="email"
									required
									bind:value={inviteEmail}
									placeholder="e.g. member@example.com"
									class="w-full pl-9 pr-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-surface)] text-[var(--color-text-primary)] text-xs focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] font-mono transition-colors"
								/>
							</div>
						</div>

						<!-- Full Name -->
						<div class="space-y-1">
							<label for="invite-name" class="text-[11px] font-bold text-[var(--color-text-secondary)] uppercase tracking-wider block">
								Full Name (Optional)
							</label>
							<div class="relative">
								<div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
									<User class="w-3.5 h-3.5" />
								</div>
								<input
									id="invite-name"
									type="text"
									name="name"
									bind:value={inviteName}
									placeholder="e.g. Anna Fourie"
									class="w-full pl-9 pr-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-surface)] text-[var(--color-text-primary)] text-xs focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] transition-colors"
								/>
							</div>
						</div>

						<!-- Relationship -->
						<div class="space-y-1">
							<label for="invite-rel" class="text-[11px] font-bold text-[var(--color-text-secondary)] uppercase tracking-wider block">
								Role & Reserve Permissions
							</label>
							<select
								id="invite-rel"
								name="relationship"
								bind:value={inviteRelationship}
								class="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-surface)] text-[var(--color-text-primary)] text-xs focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] font-medium transition-colors"
							>
								<option value="family">Family Member (View Only)</option>
								<option value="co_owner">Co-Owner (Can Add Calendar Entries)</option>
								<option value="delegate">Authorised Delegate (Can Vote on Behalf of Main PLO)</option>
							</select>
						</div>
					</div>

					<!-- Role Permissions Explainer Card -->
					<div class="p-3 rounded-xl border text-xs space-y-1 {
						inviteRelationship === 'delegate' ? 'bg-amber-50/70 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200' :
						inviteRelationship === 'co_owner' ? 'bg-blue-50/70 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-200' :
						'bg-stone-50 dark:bg-stone-900/50 border-stone-200 dark:border-stone-800 text-stone-700 dark:text-stone-300'
					}">
						<div class="font-bold flex items-center gap-1.5">
							{#if inviteRelationship === 'delegate'}
								<span>👑 Authorised Delegate Permissions:</span>
							{:else if inviteRelationship === 'co_owner'}
								<span>📅 Co-Owner Permissions:</span>
							{:else}
								<span>👁️ Family Member Permissions:</span>
							{/if}
						</div>
						<div class="text-[11px] leading-relaxed">
							{#if inviteRelationship === 'delegate'}
								Authorized to cast official ballots on governance motions on your behalf using your portion vote weight. Cannot create calendar entries.
							{:else if inviteRelationship === 'co_owner'}
								Authorized to schedule and manage reserve calendar excursion entries for your cadastral land portion. Cannot cast governance votes.
							{:else}
								Read-only visibility into reserve calendar schedules, wildlife census tallies, and constitutional documents. Cannot add calendar entries or cast votes.
							{/if}
						</div>
					</div>

					<div class="flex justify-end pt-1">
						<button
							type="submit"
							disabled={isSendingInvite || !inviteEmail}
							class="btn bg-[var(--color-primary)] hover:bg-[var(--color-primary)]/90 text-white border-0 px-5 py-2 rounded-xl text-xs font-bold shadow-xs inline-flex items-center gap-2 disabled:opacity-50"
						>
							{#if isSendingInvite}
								<span class="loading loading-spinner loading-xs"></span>
								<span>Sending Email via dialogdev.net...</span>
							{:else}
								<Send class="w-3.5 h-3.5" />
								<span>Send Invitation Email</span>
							{/if}
						</button>
					</div>
				</form>
			</div>

			<!-- Active Linked Members -->
			<div class="space-y-3">
				<div class="flex items-center justify-between">
					<h3 class="text-xs font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">
						Active Profile Members ({data.associates.length})
					</h3>
					<span class="text-[11px] text-[var(--color-text-secondary)]">Role-based reserve permissions</span>
				</div>

				{#if data.associates.length > 0}
					<div class="overflow-x-auto rounded-xl border border-[var(--color-border)]">
						<table class="w-full text-left text-xs">
							<thead class="bg-[var(--color-bg-base)] text-[var(--color-text-secondary)] font-bold uppercase text-[10px] border-b border-[var(--color-border)]">
								<tr>
									<th class="py-2.5 px-3.5">Member</th>
									<th class="py-2.5 px-3.5">Relationship & Role</th>
									<th class="py-2.5 px-3.5">Status</th>
									<th class="py-2.5 px-3.5 text-right">Actions</th>
								</tr>
							</thead>
							<tbody class="divide-y divide-[var(--color-border)] bg-[var(--color-bg-surface)]">
								{#each data.associates as assoc}
									<tr>
										<td class="py-2.5 px-3.5">
											<div class="flex items-center gap-2.5">
												<div
													class="w-7 h-7 rounded-lg text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs"
													style="background-color: {assoc.user?.color || 'var(--color-primary)'};"
												>
													{getInitials(assoc.user?.name || assoc.user?.email || 'M')}
												</div>
												<div class="min-w-0">
													<div class="font-bold text-[var(--color-text-primary)] truncate">
														{assoc.user?.name || 'Unnamed Member'}
													</div>
													<div class="text-[11px] font-mono text-[var(--color-text-secondary)] truncate">
														{assoc.user?.email}
													</div>
												</div>
											</div>
										</td>
										<td class="py-2.5 px-3.5">
											{#if assoc.relationship === 'delegate'}
												<span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
													Authorised Delegate (Voting Proxy)
												</span>
											{:else if assoc.relationship === 'co_owner'}
												<span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
													Co-Owner (Can Add Bookings)
												</span>
											{:else}
												<span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300">
													Family Member (View Only)
												</span>
											{/if}
										</td>
										<td class="py-2.5 px-3.5">
											<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
												<CheckCircle2 class="w-3 h-3" />
												Active
											</span>
										</td>
										<td class="py-2.5 px-3.5 text-right">
											<form
												method="POST"
												action="?/removeAssociate"
												use:enhance={() => {
													actionInProgress = `remove-${assoc.id}`;
													return async ({ update }) => {
														actionInProgress = null;
														await update();
													};
												}}
												onsubmit={(e) => {
													if (!confirm(`Are you sure you want to remove ${assoc.user?.name || assoc.user?.email} from your profile?`)) {
														e.preventDefault();
													}
												}}
												class="inline-block"
											>
												<input type="hidden" name="associateId" value={assoc.id} />
												<button
													type="submit"
													disabled={actionInProgress === `remove-${assoc.id}`}
													class="p-1 rounded text-stone-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
													title="Remove from profile"
													aria-label="Remove member"
												>
													<Trash2 class="w-3.5 h-3.5" />
												</button>
											</form>
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				{:else}
					<div class="p-4 rounded-xl bg-[var(--color-bg-base)] border border-[var(--color-border)] text-xs text-[var(--color-text-secondary)] text-center">
						No associates are currently linked to your profile. Use the form above to send an email invitation.
					</div>
				{/if}
			</div>

			<!-- Pending Invitations -->
			{#if data.pendingInvitations.length > 0}
				<div class="space-y-3 pt-2 border-t border-[var(--color-border)]">
					<div class="flex items-center justify-between">
						<h3 class="text-xs font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">
							Pending Invitations ({data.pendingInvitations.length})
						</h3>
						<span class="text-[11px] text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1">
							<Clock class="w-3.5 h-3.5" />
							Awaiting password setup
						</span>
					</div>

					<div class="overflow-x-auto rounded-xl border border-[var(--color-border)]">
						<table class="w-full text-left text-xs">
							<thead class="bg-[var(--color-bg-base)] text-[var(--color-text-secondary)] font-bold uppercase text-[10px] border-b border-[var(--color-border)]">
								<tr>
									<th class="py-2.5 px-3.5">Invited Email</th>
									<th class="py-2.5 px-3.5">Name / Role</th>
									<th class="py-2.5 px-3.5">Expiry</th>
									<th class="py-2.5 px-3.5 text-right">Actions</th>
								</tr>
							</thead>
							<tbody class="divide-y divide-[var(--color-border)] bg-[var(--color-bg-surface)]">
								{#each data.pendingInvitations as inv}
									<tr>
										<td class="py-2.5 px-3.5 font-mono text-[var(--color-text-primary)]">
											{inv.email}
										</td>
										<td class="py-2.5 px-3.5">
											<span class="text-[var(--color-text-primary)] font-medium">
												{inv.name || '—'}
											</span>
											{#if inv.relationship === 'delegate'}
												<span class="text-[10px] text-amber-700 dark:text-amber-400 font-semibold ml-1">
													(Authorised Delegate)
												</span>
											{:else if inv.relationship === 'co_owner'}
												<span class="text-[10px] text-blue-700 dark:text-blue-400 font-semibold ml-1">
													(Co-Owner)
												</span>
											{:else}
												<span class="text-[10px] text-stone-600 dark:text-stone-400 font-semibold ml-1">
													(Family Member)
												</span>
											{/if}
										</td>
										<td class="py-2.5 px-3.5 text-[11px] text-[var(--color-text-secondary)]">
											{getDaysUntil(inv.expiresAt)}
										</td>
										<td class="py-2.5 px-3.5 text-right space-x-1">
											<!-- Resend Email -->
											<form
												method="POST"
												action="?/resendInvite"
												use:enhance={() => {
													actionInProgress = `resend-${inv.id}`;
													return async ({ update }) => {
														actionInProgress = null;
														await update();
													};
												}}
												class="inline-block"
											>
												<input type="hidden" name="id" value={inv.id} />
												<button
													type="submit"
													disabled={actionInProgress === `resend-${inv.id}`}
													class="p-1 rounded text-stone-400 hover:text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 transition-colors"
													title="Resend invitation email"
													aria-label="Resend invitation"
												>
													<RotateCw class="w-3.5 h-3.5 {actionInProgress === `resend-${inv.id}` ? 'animate-spin' : ''}" />
												</button>
											</form>

											<!-- Revoke Invitation -->
											<form
												method="POST"
												action="?/revokeInvite"
												use:enhance={() => {
													actionInProgress = `revoke-${inv.id}`;
													return async ({ update }) => {
														actionInProgress = null;
														await update();
													};
												}}
												onsubmit={(e) => {
													if (!confirm(`Revoke the pending invitation for ${inv.email}?`)) {
														e.preventDefault();
													}
												}}
												class="inline-block"
											>
												<input type="hidden" name="id" value={inv.id} />
												<button
													type="submit"
													disabled={actionInProgress === `revoke-${inv.id}`}
													class="p-1 rounded text-stone-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
													title="Revoke invitation link"
													aria-label="Revoke invitation"
												>
													<X class="w-3.5 h-3.5" />
												</button>
											</form>
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				</div>
			{/if}
		</div>
	{:else if data.sponsor}
		<!-- Associate Member Sponsor Notice -->
		<div class="bg-[var(--color-bg-surface)] border border-[var(--color-border)] rounded-2xl p-5 sm:p-7 shadow-sm space-y-3">
			<div class="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
				<div class="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-[var(--color-primary)]">
					<ShieldCheck class="w-4 h-4" />
					<span>Sponsoring Landowner Profile</span>
				</div>
				{#if (data.user.associateRelationship || data.sponsor.relationship) === 'delegate'}
					<span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
						Authorised Delegate
					</span>
				{:else if (data.user.associateRelationship || data.sponsor.relationship) === 'co_owner'}
					<span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
						Co-Owner
					</span>
				{:else}
					<span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300">
						Family Member
					</span>
				{/if}
			</div>
			<p class="text-xs text-[var(--color-text-secondary)] leading-relaxed">
				Your account is linked under <strong>{data.sponsor.name}</strong>
				{#if data.sponsor.portionName}
					<span>({data.sponsor.portionName})</span>
				{/if}.
				{#if (data.user.associateRelationship || data.sponsor.relationship) === 'delegate'}
					As an <strong>Authorised Delegate</strong>, you have proxy voting authority on governance ballots on behalf of {data.sponsor.name}. Reserve calendar excursion bookings must be scheduled by the primary landowner or co-owners.
				{:else if (data.user.associateRelationship || data.sponsor.relationship) === 'co_owner'}
					As a <strong>Co-Owner</strong>, you have full privileges to create and manage reserve calendar bookings for your land portion. Governance voting is conducted by the primary landowner or an authorised voting delegate.
				{:else}
					As a <strong>Family Member</strong>, you have read-only visibility into reserve calendar schedules, wildlife census tallies, document vaults, and open governance ballots.
				{/if}
			</p>
		</div>
	{/if}

	<!-- 4. Home Screen Application Installation -->
	<div class="bg-[var(--color-bg-surface)] border border-[var(--color-border)] rounded-2xl p-5 sm:p-7 shadow-sm space-y-4">
		<div class="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
			<div class="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-[var(--color-primary)]">
				<Smartphone class="w-4 h-4" />
				<span>Home Screen Application</span>
			</div>
			<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase {isStandalone || isInstalled ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300'}">
				<span class="w-1.5 h-1.5 rounded-full {isStandalone || isInstalled ? 'bg-emerald-600' : 'bg-stone-400'}"></span>
				{isStandalone || isInstalled ? 'Installed on Home Screen' : 'Ready to Install'}
			</span>
		</div>

		<div class="space-y-4">
			{#if isStandalone || isInstalled}
				<div class="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-200 flex items-center gap-2.5">
					<CheckCircle2 class="w-4 h-4 text-emerald-600 shrink-0" />
					<span><strong>ACNRPLO is installed on your home screen!</strong> You are running in standalone mode.</span>
				</div>
			{/if}

			<div class="p-4 rounded-xl bg-[var(--color-bg-base)] border border-[var(--color-border)] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
				<div class="space-y-1">
					<div class="text-xs font-bold text-[var(--color-text-primary)]">
						Add ACNRPLO to Home Screen
					</div>
					<p class="text-xs text-[var(--color-text-secondary)] leading-relaxed max-w-lg">
						This button installs this app on your home screen for direct 1-tap access just like a native mobile app without opening a browser tab.
					</p>
				</div>

				<button
					type="button"
					onclick={handleInstallClick}
					class="btn bg-[var(--color-primary)] hover:bg-[var(--color-primary)]/90 text-white border-0 px-6 py-2.5 rounded-xl text-xs font-bold shadow-xs inline-flex items-center gap-2 shrink-0 justify-center w-full sm:w-auto"
				>
					<Download class="w-4 h-4" />
					<span>Install</span>
				</button>
			</div>
		</div>
	</div>

	<!-- 4. Appearance & Theme Selection (Moved here to keep menu bar clean) -->
	<div class="bg-[var(--color-bg-surface)] border border-[var(--color-border)] rounded-2xl p-5 sm:p-7 shadow-sm space-y-4">
		<div class="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
			<div class="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-[var(--color-text-primary)]">
				<Sun class="w-4 h-4 text-amber-500" />
				<span>Display & Appearance</span>
			</div>
			<span class="text-[11px] text-[var(--color-text-secondary)]">
				Current: <strong class="capitalize">{currentTheme} Mode</strong>
			</span>
		</div>

		<p class="text-xs text-[var(--color-text-secondary)]">
			Choose how the Atherstone PLO platform looks on your device. High-contrast light mode is tuned for bright sunlight in the bushveld; dark mode minimizes glare at night.
		</p>

		<div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
			<!-- Light Mode Button -->
			<button
				type="button"
				onclick={() => setTheme('light')}
				class="p-4 rounded-xl border-2 transition-all flex items-start gap-3.5 text-left {currentTheme === 'light'
					? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5 ring-1 ring-[var(--color-primary)]'
					: 'border-[var(--color-border)] bg-[var(--color-bg-base)] hover:border-[var(--color-primary)]/40'}"
			>
				<div class="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 shadow-xs">
					<Sun class="w-5 h-5" />
				</div>
				<div class="space-y-0.5">
					<div class="font-bold text-sm text-[var(--color-text-primary)] flex items-center gap-1.5">
						<span>Light Mode</span>
						{#if currentTheme === 'light'}
							<span class="w-2 h-2 rounded-full bg-[var(--color-primary)]"></span>
						{/if}
					</div>
					<p class="text-xs text-[var(--color-text-secondary)]">
						Bushveld glare-resistant palette with crisp contrasts.
					</p>
				</div>
			</button>

			<!-- Dark Mode Button -->
			<button
				type="button"
				onclick={() => setTheme('dark')}
				class="p-4 rounded-xl border-2 transition-all flex items-start gap-3.5 text-left {currentTheme === 'dark'
					? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5 ring-1 ring-[var(--color-primary)]'
					: 'border-[var(--color-border)] bg-[var(--color-bg-base)] hover:border-[var(--color-primary)]/40'}"
			>
				<div class="w-10 h-10 rounded-xl bg-stone-800 text-amber-300 flex items-center justify-center shrink-0 shadow-xs">
					<Moon class="w-5 h-5" />
				</div>
				<div class="space-y-0.5">
					<div class="font-bold text-sm text-[var(--color-text-primary)] flex items-center gap-1.5">
						<span>Dark Mode</span>
						{#if currentTheme === 'dark'}
							<span class="w-2 h-2 rounded-full bg-[var(--color-primary)]"></span>
						{/if}
					</div>
					<p class="text-xs text-[var(--color-text-secondary)]">
						Deep midnight tones for night-time and indoor use.
					</p>
				</div>
			</button>
		</div>
	</div>

	<!-- 4. Security, Session & Sign Out -->
	<div class="bg-[var(--color-bg-surface)] border border-rose-200 dark:border-rose-900/40 rounded-2xl p-5 sm:p-7 shadow-sm space-y-4">
		<div class="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
			<div class="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-rose-700 dark:text-rose-400">
				<LogOut class="w-4 h-4" />
				<span>Session & Sign Out</span>
			</div>
			<span class="text-[11px] text-[var(--color-text-secondary)]">
				Secure Constitutional Session
			</span>
		</div>

		<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
			<p class="text-xs text-[var(--color-text-secondary)] max-w-lg">
				Terminating your active session will securely log you out of this browser. You will need your reserve credentials to sign back in.
			</p>

			<form
				method="POST"
				action="/logout"
				use:enhance={() => {
					return async ({ result }) => {
						if (typeof caches !== 'undefined') {
							try {
								const keys = await caches.keys();
								await Promise.all(keys.map((k) => caches.delete(k)));
							} catch {}
						}
						if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
							navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_CACHES' });
						}
						const theme = localStorage.getItem('acnrplo-theme');
						sessionStorage.clear();
						if (theme) localStorage.setItem('acnrplo-theme', theme);

						window.location.href = result.type === 'redirect' ? result.location : '/login';
					};
				}}
				class="shrink-0"
			>
				<button
					type="submit"
					class="btn bg-rose-600 hover:bg-rose-700 text-white border-0 px-6 py-2.5 rounded-xl text-xs font-bold shadow-xs inline-flex items-center gap-2 w-full sm:w-auto justify-center"
				>
					<LogOut class="w-4 h-4" />
					<span>Sign Out of ACNRPLO</span>
				</button>
			</form>
		</div>
	</div>

	<!-- Cross-Browser PWA Installation Guidance Modal -->
	{#if showInstallModal}
		<div
			class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn"
			onclick={(e) => {
				if (e.target === e.currentTarget) showInstallModal = false;
			}}
			onkeydown={(e) => {
				if (e.key === 'Escape') showInstallModal = false;
			}}
			tabindex="-1"
			role="dialog"
			aria-modal="true"
		>
			<div class="bg-[var(--color-bg-surface)] border border-[var(--color-border)] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-scaleUp">
				<div class="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
					<div class="flex items-center gap-2.5 font-bold text-sm text-[var(--color-text-primary)]">
						<div class="w-8 h-8 rounded-lg bg-[var(--color-primary)] text-white flex items-center justify-center shrink-0">
							<Smartphone class="w-4 h-4" />
						</div>
						<span>
							{#if modalType === 'ios'}
								Install on iPhone / iPad
							{:else if modalType === 'mac_safari'}
								Add to Mac Dock (Safari)
							{:else if modalType === 'android_manual'}
								Install on Android
							{:else if modalType === 'already_installed'}
								App Already Installed
							{:else}
								Install ACNRPLO App
							{/if}
						</span>
					</div>
					<button
						type="button"
						onclick={() => (showInstallModal = false)}
						class="p-1.5 rounded-lg text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-border)]/30"
						aria-label="Close"
					>
						<X class="w-4 h-4" />
					</button>
				</div>

				{#if modalType === 'ios'}
					<div class="space-y-3 text-xs text-[var(--color-text-primary)]">
						<p class="text-[var(--color-text-secondary)] leading-relaxed">
							Apple Safari requires adding web apps to your home screen using the Share menu:
						</p>
						<div class="space-y-2.5 bg-[var(--color-bg-base)] p-3.5 rounded-xl border border-[var(--color-border)]">
							<div class="flex items-start gap-3">
								<span class="w-5 h-5 rounded-full bg-[var(--color-primary)] text-white text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">1</span>
								<div>
									Tap the <strong>Share</strong> button <Share2 class="w-3.5 h-3.5 inline text-blue-500 mx-1" /> in Safari's toolbar at the bottom or top of your screen.
								</div>
							</div>
							<div class="flex items-start gap-3">
								<span class="w-5 h-5 rounded-full bg-[var(--color-primary)] text-white text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">2</span>
								<div>
									Scroll down the menu list and tap <strong>"Add to Home Screen"</strong> <Plus class="w-3.5 h-3.5 inline mx-1" />.
								</div>
							</div>
							<div class="flex items-start gap-3">
								<span class="w-5 h-5 rounded-full bg-[var(--color-primary)] text-white text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">3</span>
								<div>
									Tap <strong>"Add"</strong> in the top-right corner to complete installation.
								</div>
							</div>
						</div>
						<p class="text-[11px] text-[var(--color-text-secondary)]">
							The ACNRPLO icon will now be placed on your home screen and open directly as a full-screen app.
						</p>
					</div>
				{:else if modalType === 'mac_safari'}
					<div class="space-y-3 text-xs text-[var(--color-text-primary)]">
						<p class="text-[var(--color-text-secondary)] leading-relaxed">
							To install ACNRPLO as a standalone app on your Mac:
						</p>
						<div class="space-y-2 bg-[var(--color-bg-base)] p-3.5 rounded-xl border border-[var(--color-border)]">
							<div class="flex items-start gap-2.5">
								<span class="w-5 h-5 rounded-full bg-[var(--color-primary)] text-white text-[11px] font-bold flex items-center justify-center shrink-0">1</span>
								<div>In Safari's top menu bar, click <strong>File</strong> (or click the Share button).</div>
							</div>
							<div class="flex items-start gap-2.5">
								<span class="w-5 h-5 rounded-full bg-[var(--color-primary)] text-white text-[11px] font-bold flex items-center justify-center shrink-0">2</span>
								<div>Select <strong>"Add to Dock..."</strong></div>
							</div>
							<div class="flex items-start gap-2.5">
								<span class="w-5 h-5 rounded-full bg-[var(--color-primary)] text-white text-[11px] font-bold flex items-center justify-center shrink-0">3</span>
								<div>Click <strong>"Add"</strong>. ACNRPLO will now open as a standalone Mac application.</div>
							</div>
						</div>
					</div>
				{:else if modalType === 'android_manual'}
					<div class="space-y-3 text-xs text-[var(--color-text-primary)]">
						<p class="text-[var(--color-text-secondary)] leading-relaxed">
							To add ACNRPLO to your Android home screen:
						</p>
						<div class="space-y-2 bg-[var(--color-bg-base)] p-3.5 rounded-xl border border-[var(--color-border)]">
							<div class="flex items-start gap-2.5">
								<span class="w-5 h-5 rounded-full bg-[var(--color-primary)] text-white text-[11px] font-bold flex items-center justify-center shrink-0">1</span>
								<div>Tap your browser menu (<strong>⋮</strong> or <strong>≡</strong> in the top or bottom corner).</div>
							</div>
							<div class="flex items-start gap-2.5">
								<span class="w-5 h-5 rounded-full bg-[var(--color-primary)] text-white text-[11px] font-bold flex items-center justify-center shrink-0">2</span>
								<div>Select <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong>.</div>
							</div>
							<div class="flex items-start gap-2.5">
								<span class="w-5 h-5 rounded-full bg-[var(--color-primary)] text-white text-[11px] font-bold flex items-center justify-center shrink-0">3</span>
								<div>Confirm by tapping <strong>"Install"</strong> or <strong>"Add"</strong>.</div>
							</div>
						</div>
					</div>
				{:else if modalType === 'already_installed'}
					<div class="space-y-3 text-xs text-[var(--color-text-primary)]">
						<div class="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 flex items-center gap-2.5">
							<CheckCircle2 class="w-5 h-5 text-emerald-600 shrink-0" />
							<span>The ACNRPLO app is already installed and running on your home screen in standalone mode.</span>
						</div>
					</div>
				{:else}
					<div class="space-y-3 text-xs text-[var(--color-text-primary)]">
						<p class="text-[var(--color-text-secondary)] leading-relaxed">
							To install in your current browser:
						</p>
						<div class="space-y-2 bg-[var(--color-bg-base)] p-3.5 rounded-xl border border-[var(--color-border)]">
							<div class="flex items-start gap-2.5">
								<span class="w-5 h-5 rounded-full bg-[var(--color-primary)] text-white text-[11px] font-bold flex items-center justify-center shrink-0">1</span>
								<div>Click the install icon in the address bar (or browser menu <strong>⋮</strong>).</div>
							</div>
							<div class="flex items-start gap-2.5">
								<span class="w-5 h-5 rounded-full bg-[var(--color-primary)] text-white text-[11px] font-bold flex items-center justify-center shrink-0">2</span>
								<div>Select <strong>"Install ACNRPLO"</strong> or <strong>"Save and share" &gt; "Install"</strong>.</div>
							</div>
						</div>
					</div>
				{/if}

				<div class="pt-2 flex justify-end">
					<button
						type="button"
						onclick={() => (showInstallModal = false)}
						class="btn bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary)]/90 border-0 px-5 py-2 rounded-xl text-xs font-bold shadow-xs"
					>
						Got It
					</button>
				</div>
			</div>
		</div>
	{/if}
</div>
