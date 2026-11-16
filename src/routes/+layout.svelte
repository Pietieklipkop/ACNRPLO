<script lang="ts">
	import '../app.css';
	import { page, navigating } from '$app/state';
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import {
		LayoutDashboard,
		Compass,
		Vote,
		FileText,
		Bot,
		Settings,
		LogOut,
		Sun,
		Moon,
		Landmark,
		TreePine,
		SlidersHorizontal,
		User,
		Users,
		CreditCard,
		ShieldCheck,
		Calendar as CalendarIcon,
		ChevronRight,
		Smartphone,
		Download,
		X
	} from 'lucide-svelte';

	let { data, children } = $props();

	let currentTheme = $state('light');
	let deferredPrompt = $state<any>(null);
	let isStandalone = $state(false);
	let showInstallBanner = $state(false);

	$effect(() => {
		try {
			const saved = localStorage.getItem('acnrplo-theme');
			if (saved === 'dark' || saved === 'light') {
				currentTheme = saved;
			}
		} catch {}
		document.documentElement.setAttribute('data-theme', currentTheme);

		// 1. Register PWA Service Worker for offline resilience
		if ('serviceWorker' in navigator) {
			navigator.serviceWorker
				.register('/service-worker.js')
				.then((reg) => {
					reg.onupdatefound = () => {
						const installing = reg.installing;
						if (installing) {
							installing.onstatechange = () => {
								if (installing.state === 'installed' && navigator.serviceWorker.controller) {
									console.log('ACNRPLO PWA: New version available.');
								}
							};
						}
					};
				})
				.catch((err) => {
					console.warn('PWA ServiceWorker registration error:', err);
				});

			// If service worker updates and takes control, refresh page data
			navigator.serviceWorker.addEventListener('controllerchange', () => {
				invalidateAll();
			});
		}

		// Ensure no stale dynamic data or HTML from previous versions remains in CacheStorage
		if (typeof caches !== 'undefined') {
			caches.keys().then((keys) => {
				for (const key of keys) {
					if (!key.startsWith('acnrplo-cache-')) {
						caches.delete(key);
					} else {
						caches.open(key).then(async (cache) => {
							const reqs = await cache.keys();
							for (const req of reqs) {
								const u = new URL(req.url);
								if (
									u.pathname.includes('__data.json') ||
									u.pathname.startsWith('/operations') ||
									u.pathname.startsWith('/profile') ||
									u.pathname.startsWith('/dashboard') ||
									u.pathname.startsWith('/admin') ||
									u.pathname.startsWith('/governance') ||
									u.pathname.startsWith('/calendar')
								) {
									await cache.delete(req);
								}
							}
						});
					}
				}
			});
		}

		// 2. Check if running in standalone PWA mode
		if (typeof window !== 'undefined') {
			isStandalone =
				window.matchMedia('(display-mode: standalone)').matches ||
				(navigator as any).standalone === true;

			// 3. Listen for beforeinstallprompt event
			const handleInstall = (e: Event) => {
				e.preventDefault();
				deferredPrompt = e;
				(window as any).__acnrploInstallPrompt = e;
				const dismissed = sessionStorage.getItem('acnrplo-pwa-dismissed');
				if (!dismissed && !isStandalone) {
					showInstallBanner = true;
				}
			};

			window.addEventListener('beforeinstallprompt', handleInstall);

			return () => {
				window.removeEventListener('beforeinstallprompt', handleInstall);
			};
		}
	});

	async function installPwa() {
		const promptEvent = deferredPrompt || (typeof window !== 'undefined' ? (window as any).__acnrploInstallPrompt : null);
		if (promptEvent) {
			promptEvent.prompt();
			const choice = await promptEvent.userChoice;
			if (choice.outcome === 'accepted') {
				showInstallBanner = false;
				deferredPrompt = null;
				if (typeof window !== 'undefined') (window as any).__acnrploInstallPrompt = null;
			}
		}
	}

	function dismissInstallBanner() {
		showInstallBanner = false;
		try {
			sessionStorage.setItem('acnrplo-pwa-dismissed', 'true');
		} catch {}
	}

	const isSecretary = $derived(data.user?.roles?.includes('secretary'));
	const isExecutive = $derived(data.user?.roles?.includes('executive'));
</script>

<svelte:head>
	<title>ACNRPLO — Atherstone Private Land Owners Platform</title>
</svelte:head>

<!-- Instant Top Navigation Progress Indicator for Mobile and Desktop -->
{#if navigating.to}
	<div class="fixed top-0 left-0 right-0 z-50 h-1 bg-[var(--color-primary)] animate-pulse shadow-xs"></div>
{/if}

<div class="min-h-screen min-h-[100dvh] flex flex-col lg:flex-row bg-[var(--color-bg-base)] text-[var(--color-text-primary)] w-full max-w-full overflow-x-hidden">
	{#if data.user}
		<!-- ========================================== -->
		<!-- DESKTOP LEFT SIDEBAR NAVIGATION            -->
		<!-- ========================================== -->
		<aside
			class="hidden lg:flex flex-col fixed inset-y-0 left-0 w-64 z-40 border-r border-[var(--color-border)] bg-[var(--color-bg-surface)] shadow-xs select-none"
		>
			<!-- Brand Header -->
			<div class="p-5 border-b border-[var(--color-border)] flex items-center gap-3 shrink-0">
				<div class="w-10 h-10 rounded-xl bg-[var(--color-primary)] text-white flex items-center justify-center shadow-xs">
					<TreePine class="w-6 h-6" />
				</div>
				<div class="flex flex-col">
					<span class="font-black text-base tracking-wider uppercase text-[var(--color-primary)]">ACNRPLO</span>
					<span class="text-[11px] text-[var(--color-text-secondary)] font-medium -mt-0.5">Atherstone Reserve</span>
				</div>
			</div>

			<!-- User Mini-Card in Sidebar linking to Profile -->
			<a
				href="/profile"
				class="block p-4 mx-3 my-3 rounded-xl bg-[var(--color-bg-base)] hover:bg-[var(--color-border)]/30 border border-[var(--color-border)] space-y-2 transition-all group {page.url.pathname === '/profile' ? 'ring-2 ring-[var(--color-primary)] bg-[var(--color-primary)]/5' : ''}"
				title="View your profile, portion & settings"
			>
				<div class="flex items-center justify-between">
					<div class="font-bold text-xs truncate group-hover:text-[var(--color-primary)] transition-colors" title={data.user.name}>
						{data.user.name}
					</div>
					{#if data.user.ownershipPercentage !== undefined && data.user.ownershipPercentage > 0}
						<span class="px-1.5 py-0.5 rounded text-[10px] font-black tabular-nums bg-[var(--color-secondary)]/10 text-[var(--color-secondary)]">
							{data.user.ownershipPercentage.toFixed(1)}%
						</span>
					{/if}
				</div>
				{#if data.user.sponsorName}
					<div class="text-[10px] text-[var(--color-text-secondary)] truncate">
						Sponsor: <span class="font-semibold text-[var(--color-text-primary)]">{data.user.sponsorName}</span>
					</div>
				{/if}
				<div class="flex flex-wrap gap-1">
					{#each data.user?.roles || [] as role}
						{#if role === 'associate'}
							<span
								class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider {data.user.associateRelationship === 'co_owner'
									? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
									: data.user.associateRelationship === 'delegate'
										? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
										: 'bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300'}"
							>
								{data.user.associateRelationship === 'co_owner'
									? 'Co-Owner'
									: data.user.associateRelationship === 'delegate'
										? 'Authorised Delegate'
										: 'Family Member'}
							</span>
						{:else}
							<span
								class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider {role === 'secretary'
									? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
									: role === 'executive'
										? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
										: role === 'main_plo'
											? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
											: 'bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300'}"
							>
								{role.replace('_', ' ')}
							</span>
						{/if}
					{/each}
				</div>
			</a>

			<!-- Primary Navigation List -->
			<nav class="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
				<div class="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">
					Reserve Menu
				</div>

				{#if isSecretary}
					<!-- 1. Reserve Cockpit -->
					<a
						href="/dashboard"
						class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all {page.url.pathname === '/dashboard'
							? 'bg-[var(--color-primary)] text-white shadow-xs font-bold'
							: 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-border)]/30'}"
					>
						<LayoutDashboard class="w-4 h-4 shrink-0" />
						<span>Reserve Cockpit</span>
					</a>

					<!-- 2. Field Operations -->
					<a
						href="/operations"
						class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all {page.url.pathname.startsWith('/operations') || page.url.pathname.startsWith('/calendar') || page.url.pathname.startsWith('/quotas') || page.url.pathname.startsWith('/game-counts')
							? 'bg-[var(--color-primary)] text-white shadow-xs font-bold'
							: 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-border)]/30'}"
					>
						<Compass class="w-4 h-4 shrink-0" />
						<span>Field Operations</span>
					</a>

					<!-- 3. Governance -->
					<a
						href="/governance"
						class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all {page.url.pathname.startsWith('/governance') || page.url.pathname.startsWith('/members/associates')
							? 'bg-[var(--color-primary)] text-white shadow-xs font-bold'
							: 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-border)]/30'}"
					>
						<Vote class="w-4 h-4 shrink-0" />
						<span>Governance & Voting</span>
					</a>

					<!-- 4. Document Vault -->
					<a
						href="/documents"
						class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all {page.url.pathname === '/documents'
							? 'bg-[var(--color-primary)] text-white shadow-xs font-bold'
							: 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-border)]/30'}"
					>
						<FileText class="w-4 h-4 shrink-0" />
						<span>Document Vault</span>
					</a>

					<!-- 5. Standalone Constitution AI -->
					<div class="pt-2">
						<a
							href="/constitution/ai"
							class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all {page.url.pathname.startsWith('/constitution')
								? 'bg-purple-700 text-white shadow-xs'
								: 'bg-purple-50 hover:bg-purple-100 text-purple-900 dark:bg-purple-950/50 dark:text-purple-300 dark:hover:bg-purple-950 border border-purple-200 dark:border-purple-800/50'}"
						>
							<Bot class="w-4 h-4 shrink-0 text-purple-600 dark:text-purple-300" />
							<span>Constitution AI</span>
						</a>
					</div>

					<!-- Secretary Administration -->
					<div class="pt-5 space-y-1">
						<div class="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-purple-700 dark:text-purple-400">
							Secretary Administration
						</div>

						<!-- 1. Landowners & Portions -->
						<a
							href="/admin/members"
							class="flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all {page.url.pathname.startsWith('/admin/members')
								? 'bg-[var(--color-primary)] text-white font-bold shadow-xs'
								: 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-border)]/30'}"
						>
							<Users class="w-4 h-4 shrink-0" />
							<span>Landowners & Portions</span>
						</a>

						<!-- 2. Decisions Lifecycle -->
						<a
							href="/admin/polls"
							class="flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all {page.url.pathname.startsWith('/admin/polls')
								? 'bg-[var(--color-primary)] text-white font-bold shadow-xs'
								: 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-border)]/30'}"
						>
							<Vote class="w-4 h-4 shrink-0" />
							<span>Decisions Lifecycle</span>
						</a>

						<!-- 3. Executive Finance -->
						<a
							href="/admin/finance"
							class="flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all {page.url.pathname.startsWith('/admin/finance')
								? 'bg-[var(--color-primary)] text-white font-bold shadow-xs'
								: 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-border)]/30'}"
						>
							<CreditCard class="w-4 h-4 shrink-0" />
							<span>Executive Finance</span>
						</a>

						<!-- 4. Audit Trail -->
						<a
							href="/admin/audit"
							class="flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all {page.url.pathname.startsWith('/admin/audit')
								? 'bg-[var(--color-primary)] text-white font-bold shadow-xs'
								: 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-border)]/30'}"
						>
							<ShieldCheck class="w-4 h-4 shrink-0" />
							<span>Audit Trail</span>
						</a>

						<!-- 5. Master Data -->
						<a
							href="/admin/master-data"
							class="flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all {page.url.pathname.startsWith('/admin/master-data') || page.url.pathname.startsWith('/master-data')
								? 'bg-purple-700 text-white font-bold shadow-xs'
								: 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-border)]/30'}"
						>
							<SlidersHorizontal class="w-4 h-4 shrink-0" />
							<span>Master Data</span>
						</a>
					</div>
				{:else}
					<!-- Non-Secretary Member Navigation (Testing Mode: Strictly Shared Calendar & Polls) -->
					<!-- 1. Shared Calendar -->
					<a
						href="/operations?tab=calendar"
						class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all {page.url.pathname.startsWith('/operations') || page.url.pathname.startsWith('/calendar')
							? 'bg-[var(--color-primary)] text-white shadow-xs font-bold'
							: 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-border)]/30'}"
					>
						<CalendarIcon class="w-4 h-4 shrink-0" />
						<span>Shared Calendar</span>
					</a>

					<!-- 2. Decisions -->
					<a
						href="/governance"
						class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all {page.url.pathname.startsWith('/governance')
							? 'bg-[var(--color-primary)] text-white shadow-xs font-bold'
							: 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-border)]/30'}"
					>
						<Vote class="w-4 h-4 shrink-0" />
						<span>Decisions</span>
					</a>

					<!-- 3. Account & Profile -->
					<a
						href="/profile"
						class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all {page.url.pathname === '/profile'
							? 'bg-[var(--color-primary)] text-white shadow-xs font-bold'
							: 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-border)]/30'}"
					>
						<User class="w-4 h-4 shrink-0" />
						<span>My Account & Portion</span>
					</a>
				{/if}
			</nav>

			<!-- Sidebar Footer: Account & Profile Link + Quick Sign Out -->
			<div class="p-3 border-t border-[var(--color-border)] shrink-0 bg-[var(--color-bg-base)] flex items-center gap-2">
				<a
					href="/profile"
					class="flex-1 flex items-center justify-between p-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-surface)] hover:border-[var(--color-primary)]/50 transition-all text-xs group {page.url.pathname === '/profile' ? 'ring-2 ring-[var(--color-primary)] bg-[var(--color-primary)]/5 font-bold' : ''}"
					title="My Account & Profile"
				>
					<div class="flex items-center gap-2 min-w-0">
						<div class="w-7 h-7 rounded-lg bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center font-bold text-xs shrink-0 group-hover:scale-105 transition-transform">
							<User class="w-3.5 h-3.5" />
						</div>
						<div class="truncate">
							<div class="font-bold text-[var(--color-text-primary)] truncate text-[11px]">My Account</div>
							<div class="text-[9px] text-[var(--color-text-secondary)] truncate">Portion & Settings</div>
						</div>
					</div>
					<ChevronRight class="w-3.5 h-3.5 text-[var(--color-text-secondary)] group-hover:translate-x-0.5 transition-transform shrink-0" />
				</a>
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
						class="p-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-surface)] hover:bg-rose-50 hover:border-rose-300 dark:hover:bg-rose-950/40 text-[var(--color-text-secondary)] hover:text-rose-600 transition-colors"
						title="Sign Out of ACNRPLO"
						aria-label="Sign Out"
					>
						<LogOut class="w-4 h-4" />
					</button>
				</form>
			</div>
		</aside>

		<!-- ========================================== -->
		<!-- MOBILE TOP BAR (< lg)                      -->
		<!-- ========================================== -->
		<header
			class="lg:hidden fixed top-0 left-0 right-0 z-30 h-[calc(3.5rem+env(safe-area-inset-top,0px))] pt-[env(safe-area-inset-top,0px)] border-b border-[var(--color-border)] bg-[var(--color-bg-surface)]/95 backdrop-blur-md px-3 sm:px-4 flex items-center justify-between w-full max-w-full select-none"
		>
			<a href={isSecretary ? "/dashboard" : "/operations?tab=calendar"} class="flex items-center gap-2 font-bold tracking-tight">
				<div class="w-8 h-8 rounded-lg bg-[var(--color-primary)] text-white flex items-center justify-center">
					<TreePine class="w-5 h-5" />
				</div>
				<span class="font-black text-sm uppercase text-[var(--color-primary)]">ACNRPLO</span>
			</a>

			<div class="flex items-center gap-1.5 sm:gap-2">
				{#if isSecretary}
					<a
						href="/admin/members"
						class="p-2 rounded-lg border border-[var(--color-border)] text-purple-700 dark:text-purple-400 hover:bg-[var(--color-border)]/30"
						title="Secretary Administration"
						aria-label="Secretary Administration"
					>
						<Settings class="w-4 h-4" />
					</a>
				{/if}

				<!-- Account Button linking to Profile (Icon only) -->
				<a
					href="/profile"
					class="p-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-surface)] hover:bg-[var(--color-border)]/30 text-[var(--color-primary)] transition-all {page.url.pathname === '/profile' ? 'ring-2 ring-[var(--color-primary)] bg-[var(--color-primary)]/10' : ''}"
					title="My Profile & Account"
					aria-label="My Profile & Account"
				>
					<User class="w-5 h-5 text-[var(--color-primary)]" />
				</a>
			</div>
		</header>
	{/if}

	<!-- ========================================== -->
	<!-- MAIN CONTENT CONTAINER                    -->
	<!-- ========================================== -->
	<div class="flex-1 flex flex-col min-w-0 w-full max-w-full overflow-x-hidden {data.user ? 'lg:pl-64 pt-[calc(3.5rem+env(safe-area-inset-top,0px))] lg:pt-0' : ''}">
		<main class="flex-1 max-w-7xl w-full min-w-0 mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 pb-[calc(5rem+env(safe-area-inset-bottom,0px))] lg:pb-12 overflow-x-hidden">
			{#if showInstallBanner && deferredPrompt}
				<div class="mb-4 p-3.5 rounded-2xl bg-[var(--color-primary)] text-white shadow-md flex items-center justify-between gap-3 animate-fadeIn">
					<div class="flex items-center gap-3 min-w-0">
						<div class="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
							<Smartphone class="w-5 h-5 text-white" />
						</div>
						<div class="truncate">
							<div class="text-xs font-bold truncate">Install ACNRPLO App</div>
							<div class="text-[10px] text-white/80 truncate">Install to your home screen for direct 1-tap app access</div>
						</div>
					</div>
					<div class="flex items-center gap-2 shrink-0">
						<button
							type="button"
							onclick={installPwa}
							class="btn btn-xs bg-white text-[var(--color-primary)] hover:bg-white/90 border-0 font-bold px-3 py-1 rounded-lg text-xs shadow-xs"
						>
							<Download class="w-3.5 h-3.5" />
							<span>Install</span>
						</button>
						<button
							type="button"
							onclick={dismissInstallBanner}
							aria-label="Dismiss banner"
							class="p-1 rounded-lg text-white/70 hover:text-white hover:bg-white/10"
						>
							<X class="w-4 h-4" />
						</button>
					</div>
				</div>
			{/if}

			{@render children()}
		</main>
	</div>

	{#if data.user}
		<!-- ========================================== -->
		<!-- MOBILE BOTTOM BAR                          -->
		<!-- ========================================== -->
		<nav
			class="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-[var(--color-bg-surface)] border-t border-[var(--color-border)] flex items-center justify-around h-[calc(4rem+env(safe-area-inset-bottom,0px))] pb-[env(safe-area-inset-bottom,0px)] px-1 shadow-lg w-full max-w-full select-none"
		>
			{#if isSecretary}
				<!-- 1. Cockpit -->
				<a
					href="/dashboard"
					class="flex flex-col items-center justify-center flex-1 py-1 text-xs {page.url.pathname === '/dashboard'
						? 'text-[var(--color-primary)] font-bold'
						: 'text-[var(--color-text-secondary)]'}"
				>
					<LayoutDashboard class="w-5 h-5" />
					<span class="text-[10px] mt-0.5">Cockpit</span>
				</a>

				<!-- 2. Operations -->
				<a
					href="/operations"
					class="flex flex-col items-center justify-center flex-1 py-1 text-xs {page.url.pathname.startsWith('/operations') || page.url.pathname.startsWith('/calendar') || page.url.pathname.startsWith('/quotas') || page.url.pathname.startsWith('/game-counts')
						? 'text-[var(--color-primary)] font-bold'
						: 'text-[var(--color-text-secondary)]'}"
				>
					<Compass class="w-5 h-5" />
					<span class="text-[10px] mt-0.5">Operations</span>
				</a>

				<!-- 3. Governance -->
				<a
					href="/governance"
					class="flex flex-col items-center justify-center flex-1 py-1 text-xs {page.url.pathname.startsWith('/governance') || page.url.pathname.startsWith('/members/associates')
						? 'text-[var(--color-primary)] font-bold'
						: 'text-[var(--color-text-secondary)]'}"
				>
					<Vote class="w-5 h-5" />
					<span class="text-[10px] mt-0.5">Governance</span>
				</a>

				<!-- 4. Vault -->
				<a
					href="/documents"
					class="flex flex-col items-center justify-center flex-1 py-1 text-xs {page.url.pathname === '/documents'
						? 'text-[var(--color-primary)] font-bold'
						: 'text-[var(--color-text-secondary)]'}"
				>
					<FileText class="w-5 h-5" />
					<span class="text-[10px] mt-0.5">Vault</span>
				</a>

				<!-- 5. AI -->
				<a
					href="/constitution/ai"
					class="flex flex-col items-center justify-center flex-1 py-1 text-xs {page.url.pathname.startsWith('/constitution')
						? 'text-purple-600 dark:text-purple-400 font-bold'
						: 'text-[var(--color-text-secondary)]'}"
				>
					<Bot class="w-5 h-5 text-purple-600 dark:text-purple-400" />
					<span class="text-[10px] mt-0.5">AI</span>
				</a>
			{:else}
				<!-- Non-Secretary Member Navigation (Testing Mode: Strictly 2 items) -->
				<a
					href="/operations?tab=calendar"
					class="flex flex-col items-center justify-center flex-1 py-1 text-xs {page.url.pathname.startsWith('/operations') || page.url.pathname.startsWith('/calendar')
						? 'text-[var(--color-primary)] font-bold'
						: 'text-[var(--color-text-secondary)]'}"
				>
					<CalendarIcon class="w-5 h-5" />
					<span class="text-[10px] mt-0.5">Shared Calendar</span>
				</a>

				<a
					href="/governance"
					class="flex flex-col items-center justify-center flex-1 py-1 text-xs {page.url.pathname.startsWith('/governance')
						? 'text-[var(--color-primary)] font-bold'
						: 'text-[var(--color-text-secondary)]'}"
				>
					<Vote class="w-5 h-5" />
					<span class="text-[10px] mt-0.5">Decisions</span>
				</a>

				<a
					href="/profile"
					class="flex flex-col items-center justify-center flex-1 py-1 text-xs {page.url.pathname === '/profile'
						? 'text-[var(--color-primary)] font-bold'
						: 'text-[var(--color-text-secondary)]'}"
				>
					<User class="w-5 h-5" />
					<span class="text-[10px] mt-0.5">Account</span>
				</a>
			{/if}
		</nav>
	{/if}
</div>
