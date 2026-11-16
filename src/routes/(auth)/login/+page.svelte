<script lang="ts">
	import { enhance } from '$app/forms';
	import { TreePine, Lock, User, AlertCircle, KeyRound, CheckCircle2 } from 'lucide-svelte';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let identifier = $state('');
	let password = $state('');
	let isSubmitting = $state(false);

	$effect(() => {
		if (data.prefillEmail) {
			identifier = data.prefillEmail;
		}
	});
</script>

<div class="min-h-[85vh] flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8">
	<div class="w-full max-w-md space-y-8">
		<!-- Header / Logo -->
		<div class="text-center">
			<div
				class="mx-auto w-16 h-16 rounded-2xl bg-[var(--color-primary)] text-white flex items-center justify-center shadow-md mb-4"
			>
				<TreePine class="w-9 h-9" />
			</div>
			<h1 class="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--color-text-primary)]">
				ACNRPLO Platform
			</h1>
			<p class="text-xs sm:text-sm text-[var(--color-text-secondary)] mt-1.5 font-medium">
				Atherstone Collaborative Nature Reserve — Private Land Owners
			</p>
		</div>

		<!-- Login Card -->
		<div
			class="bg-[var(--color-bg-surface)] p-6 sm:p-8 rounded-2xl border border-[var(--color-border)] shadow-md space-y-6"
		>
			{#if data.registered}
				<div
					class="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 flex items-start gap-3 text-emerald-800 dark:text-emerald-200 text-xs"
				>
					<CheckCircle2 class="w-5 h-5 flex-shrink-0 mt-0.5 text-emerald-600" />
					<div class="space-y-0.5">
						<div class="font-bold">Password set successfully!</div>
						<p class="text-[11px] opacity-90">Your account is active. Please log in below with your new password to access the reserve portal.</p>
					</div>
				</div>
			{/if}

			{#if form?.error}
				<div
					class="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 flex items-start gap-3 text-rose-800 dark:text-rose-200 text-sm"
				>
					<AlertCircle class="w-5 h-5 flex-shrink-0 mt-0.5 text-rose-600" />
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
							// Purge CacheStorage when logging in so there is zero leftover data from previous user
							if (typeof caches !== 'undefined') {
								try {
									const keys = await caches.keys();
									await Promise.all(keys.map((k) => caches.delete(k)));
								} catch {}
							}
							if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
								navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_CACHES' });
							}
							// Hard navigate so layout, Svelte stores, and session state are 100% clean and fresh
							window.location.href = result.location;
							return;
						}
						await update();
					};
				}}
				class="space-y-5"
			>
				<!-- Username or Email -->
				<div>
					<label for="identifier" class="block text-xs font-bold uppercase tracking-wider text-[var(--color-text-secondary)] mb-1.5">
						Username or Email
					</label>
					<div class="relative">
						<div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[var(--color-text-secondary)]">
							<User class="w-5 h-5" />
						</div>
						<input
							id="identifier"
							name="identifier"
							type="text"
							required
							bind:value={identifier}
							autocomplete="username"
							placeholder="Enter your email or username..."
							class="w-full pl-11 pr-4 py-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-base)] text-[var(--color-text-primary)] text-base focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] transition-colors"
						/>
					</div>
				</div>

				<!-- Password -->
				<div>
					<label for="password" class="block text-xs font-bold uppercase tracking-wider text-[var(--color-text-secondary)] mb-1.5">
						Password
					</label>
					<div class="relative">
						<div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[var(--color-text-secondary)]">
							<Lock class="w-5 h-5" />
						</div>
						<input
							id="password"
							name="password"
							type="password"
							required
							bind:value={password}
							autocomplete="current-password"
							placeholder="••••••••••••"
							class="w-full pl-11 pr-4 py-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-base)] text-[var(--color-text-primary)] text-base focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] transition-colors"
						/>
					</div>
				</div>

				<!-- Submit Button -->
				<button
					type="submit"
					disabled={isSubmitting}
					class="w-full h-12 rounded-lg bg-[var(--color-primary)] text-white font-bold text-base flex items-center justify-center gap-2 shadow-sm hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
				>
					{#if isSubmitting}
						<span class="loading loading-spinner loading-sm"></span>
						Authenticating...
					{:else}
						<KeyRound class="w-5 h-5" />
						Sign In to Reserve Portal
					{/if}
				</button>
			</form>
		</div>

		<!-- Governance Notice -->
		<p class="text-center text-xs text-[var(--color-text-secondary)] px-4">
			Registration is restricted. All member accounts and land portions are provisioned directly by the Secretary under reserve constitutional governance.
		</p>
	</div>
</div>
