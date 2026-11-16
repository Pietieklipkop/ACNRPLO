<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData, ActionData } from './$types';
	import {
		TreePine,
		Lock,
		User,
		Mail,
		CheckCircle2,
		AlertCircle,
		ArrowRight,
		Eye,
		EyeOff,
		KeyRound,
		ShieldCheck,
		Landmark
	} from 'lucide-svelte';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let name = $state('');
	let password = $state('');
	let confirmPassword = $state('');
	let showPassword = $state(false);
	let showConfirmPassword = $state(false);
	let isSubmitting = $state(false);

	$effect(() => {
		if (data.name) {
			name = data.name;
		}
	});

	const isLengthValid = $derived(password.length >= 8);
	const doPasswordsMatch = $derived(password.length > 0 && password === confirmPassword);
</script>

<svelte:head>
	<title>Set Password & Activate Profile — ACNRPLO Reserve</title>
</svelte:head>

<div class="min-h-[85vh] flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8">
	<div class="w-full max-w-md space-y-6">
		<!-- Header / Logo -->
		<div class="text-center">
			<div
				class="mx-auto w-16 h-16 rounded-2xl bg-[var(--color-primary)] text-white flex items-center justify-center shadow-md mb-4"
			>
				<TreePine class="w-9 h-9" />
			</div>
			<h1 class="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--color-text-primary)]">
				ACNRPLO Reserve
			</h1>
			<p class="text-xs sm:text-sm text-[var(--color-text-secondary)] mt-1 font-medium">
				Atherstone Collaborative Nature Reserve — Private Land Owners
			</p>
		</div>

		{#if !data.valid}
			<!-- Invalid / Expired Invitation Card -->
			<div class="bg-[var(--color-bg-surface)] p-6 sm:p-8 rounded-2xl border border-[var(--color-border)] shadow-md space-y-5 text-center">
				<div class="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-950/50 text-rose-600 flex items-center justify-center mx-auto">
					<AlertCircle class="w-6 h-6" />
				</div>

				<div class="space-y-2">
					<h2 class="text-lg font-bold text-[var(--color-text-primary)]">
						{data.alreadyAccepted ? 'Invitation Already Accepted' : 'Invalid or Expired Link'}
					</h2>
					<p class="text-xs text-[var(--color-text-secondary)] leading-relaxed">
						{data.error || 'This invitation link is no longer valid. Please request a new invitation from your sponsoring member.'}
					</p>
				</div>

				<div class="pt-2">
					<a
						href="/login"
						class="w-full h-11 rounded-xl bg-[var(--color-primary)] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs hover:brightness-110 transition-all"
					>
						<span>Proceed to Sign In</span>
						<ArrowRight class="w-4 h-4" />
					</a>
				</div>
			</div>
		{:else}
			<!-- Invitation Acceptance Card -->
			<div class="bg-[var(--color-bg-surface)] p-6 sm:p-8 rounded-2xl border border-[var(--color-border)] shadow-md space-y-6">
				<!-- Sponsor Invitation Summary Badge -->
				<div class="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 space-y-2 text-xs">
					<div class="flex items-center gap-2 font-bold text-emerald-900 dark:text-emerald-200 text-sm">
						<ShieldCheck class="w-4 h-4 text-emerald-600" />
						<span>Profile Member Invitation</span>
					</div>
					<p class="text-emerald-800 dark:text-emerald-300 leading-relaxed">
						You have been invited by <strong>{data.sponsorName}</strong>
						{#if data.portionName}
							<span>({data.portionName})</span>
						{/if}
						to join their profile as an <strong>Associate Member</strong>.
					</p>
				</div>

				{#if form?.error}
					<div
						class="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 flex items-start gap-3 text-rose-800 dark:text-rose-200 text-xs"
					>
						<AlertCircle class="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-600" />
						<div>{form.error}</div>
					</div>
				{/if}

				<form
					method="POST"
					use:enhance={() => {
						isSubmitting = true;
						return async ({ result, update }) => {
							isSubmitting = false;
							if (result.type === 'redirect') {
								if (typeof caches !== 'undefined') {
									try {
										const keys = await caches.keys();
										await Promise.all(keys.map((k) => caches.delete(k)));
									} catch {}
								}
								if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
									navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_CACHES' });
								}
								window.location.href = result.location;
								return;
							}
							await update();
						};
					}}
					class="space-y-4"
				>
					<input type="hidden" name="token" value={data.token} />

					<!-- Readonly Email Address -->
					<div>
						<label for="email" class="block text-xs font-bold uppercase tracking-wider text-[var(--color-text-secondary)] mb-1">
							Email Address
						</label>
						<div class="relative">
							<div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
								<Mail class="w-4 h-4" />
							</div>
							<input
								id="email"
								type="email"
								disabled
								value={data.email}
								class="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-base)] text-[var(--color-text-secondary)] text-xs font-mono cursor-not-allowed opacity-80"
							/>
						</div>
						<p class="text-[10px] text-[var(--color-text-secondary)] mt-1">
							This is your registered account email invited by {data.sponsorName}.
						</p>
					</div>

					<!-- Full Name -->
					<div>
						<label for="name" class="block text-xs font-bold uppercase tracking-wider text-[var(--color-text-secondary)] mb-1">
							Your Full Name
						</label>
						<div class="relative">
							<div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[var(--color-text-secondary)]">
								<User class="w-4 h-4" />
							</div>
							<input
								id="name"
								name="name"
								type="text"
								required
								bind:value={name}
								placeholder="e.g. Johan Fourie"
								class="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-base)] text-[var(--color-text-primary)] text-xs focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] transition-colors"
							/>
						</div>
					</div>

					<!-- New Password -->
					<div>
						<label for="password" class="block text-xs font-bold uppercase tracking-wider text-[var(--color-text-secondary)] mb-1">
							Choose Password
						</label>
						<div class="relative">
							<div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[var(--color-text-secondary)]">
								<Lock class="w-4 h-4" />
							</div>
							<input
								id="password"
								name="password"
								type={showPassword ? 'text' : 'password'}
								required
								bind:value={password}
								autocomplete="new-password"
								placeholder="Minimum 8 characters..."
								class="w-full pl-10 pr-10 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-base)] text-[var(--color-text-primary)] text-xs focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] transition-colors"
							/>
							<button
								type="button"
								onclick={() => (showPassword = !showPassword)}
								class="absolute inset-y-0 right-0 pr-3 flex items-center text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
								aria-label={showPassword ? 'Hide password' : 'Show password'}
							>
								{#if showPassword}
									<EyeOff class="w-4 h-4" />
								{:else}
									<Eye class="w-4 h-4" />
								{/if}
							</button>
						</div>
					</div>

					<!-- Confirm Password -->
					<div>
						<label for="confirmPassword" class="block text-xs font-bold uppercase tracking-wider text-[var(--color-text-secondary)] mb-1">
							Confirm Password
						</label>
						<div class="relative">
							<div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[var(--color-text-secondary)]">
								<Lock class="w-4 h-4" />
							</div>
							<input
								id="confirmPassword"
								name="confirmPassword"
								type={showConfirmPassword ? 'text' : 'password'}
								required
								bind:value={confirmPassword}
								autocomplete="new-password"
								placeholder="Re-enter password..."
								class="w-full pl-10 pr-10 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-base)] text-[var(--color-text-primary)] text-xs focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] transition-colors"
							/>
							<button
								type="button"
								onclick={() => (showConfirmPassword = !showConfirmPassword)}
								class="absolute inset-y-0 right-0 pr-3 flex items-center text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
								aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
							>
								{#if showConfirmPassword}
									<EyeOff class="w-4 h-4" />
								{:else}
									<Eye class="w-4 h-4" />
								{/if}
							</button>
						</div>
					</div>

					<!-- Validation Checklist -->
					<div class="space-y-1 pt-1 text-[11px]">
						<div class="flex items-center gap-1.5 {isLengthValid ? 'text-emerald-600 font-semibold' : 'text-stone-400'}">
							<CheckCircle2 class="w-3.5 h-3.5" />
							<span>At least 8 characters long</span>
						</div>
						<div class="flex items-center gap-1.5 {doPasswordsMatch ? 'text-emerald-600 font-semibold' : 'text-stone-400'}">
							<CheckCircle2 class="w-3.5 h-3.5" />
							<span>Passwords match</span>
						</div>
					</div>

					<!-- Submit Button -->
					<button
						type="submit"
						disabled={isSubmitting || !isLengthValid || !doPasswordsMatch}
						class="w-full h-11 rounded-xl bg-[var(--color-primary)] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-2"
					>
						{#if isSubmitting}
							<span class="loading loading-spinner loading-xs"></span>
							<span>Setting Password &amp; Activating...</span>
						{:else}
							<KeyRound class="w-4 h-4" />
							<span>Set Password &amp; Join Profile</span>
						{/if}
					</button>
				</form>
			</div>
		{/if}

		<!-- Security Notice -->
		<p class="text-center text-[11px] text-[var(--color-text-secondary)] px-4">
			Atherstone Collaborative Nature Reserve. Associate accounts are linked to their sponsoring Main PLO Member under reserve constitutional governance.
		</p>
	</div>
</div>
