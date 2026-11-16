<script lang="ts">
	import {
		ShieldCheck,
		Search,
		FileCode,
		Copy,
		Check,
		X
	} from 'lucide-svelte';

	let { data } = $props();

	let searchQuery = $state('');
	let inspectingLog = $state<any | null>(null);
	let copied = $state(false);

	function copyJson(obj: any) {
		navigator.clipboard.writeText(JSON.stringify(obj, null, 2));
		copied = true;
		setTimeout(() => (copied = false), 2000);
	}

	const filteredLogs = $derived(
		(data.auditLogs || []).filter((log: any) => {
			const q = searchQuery.trim().toLowerCase();
			if (!q) return true;
			return (
				log.userEmail.toLowerCase().includes(q) ||
				log.actionType.toLowerCase().includes(q) ||
				(log.recordType && log.recordType.toLowerCase().includes(q))
			);
		})
	);
</script>

<svelte:head>
	<title>Tamper-Evident Audit Trail — ACNRPLO</title>
</svelte:head>

<div class="space-y-6">
	<!-- Section Title & Sub-Nav Header -->
	<div class="bg-[var(--color-bg-surface)] border border-[var(--color-border)] rounded-2xl p-4 sm:p-6 shadow-sm">
		<div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
			<div>
				<div class="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-purple-700 dark:text-purple-400">
					<ShieldCheck class="w-4 h-4" />
					Immutable Fiduciary Audit Ledger
				</div>
				<h1 class="text-2xl sm:text-3xl font-extrabold tracking-tight mt-1">
					Tamper-Evident Audit Trail
				</h1>
				<p class="text-xs sm:text-sm text-[var(--color-text-secondary)] mt-1 max-w-2xl">
					Chronological ledger recording all reserve administrative operations, financial postings, quota adjustments, and member status alterations.
				</p>
			</div>

			<!-- Search Input -->
			<div class="relative w-full sm:w-72">
				<Search class="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]" />
				<input
					type="text"
					placeholder="Search by action, email, or record..."
					bind:value={searchQuery}
					class="input input-bordered input-sm w-full pl-10 text-xs rounded-xl"
				/>
			</div>
		</div>

		<!-- Audit Ledger Stat Badges -->
		<div class="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6 pt-6 border-t border-[var(--color-border)]">
			<div class="p-3.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-base)]/60">
				<div class="text-xs font-bold text-[var(--color-text-secondary)]">Total Recorded Audit Events</div>
				<div class="text-xl font-extrabold font-mono text-purple-600 mt-1">{data.auditLogs.length}</div>
				<div class="text-[11px] text-[var(--color-text-secondary)]">Permanently written to D1 database</div>
			</div>

			<div class="p-3.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-base)]/60">
				<div class="text-xs font-bold text-[var(--color-text-secondary)]">Immutability Standard</div>
				<div class="text-xl font-extrabold text-emerald-600 mt-1">Append-Only</div>
				<div class="text-[11px] text-[var(--color-text-secondary)]">No update or delete privileges allowed</div>
			</div>

			<div class="p-3.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-base)]/60">
				<div class="text-xs font-bold text-[var(--color-text-secondary)]">Constitutional Oversight</div>
				<div class="text-xl font-extrabold text-blue-600 mt-1">AGM Ready</div>
				<div class="text-[11px] text-[var(--color-text-secondary)]">Exportable for annual legal & ecological compliance</div>
			</div>
		</div>
	</div>

	<!-- Audit Trail Table -->
	<div class="bg-[var(--color-bg-surface)] rounded-2xl border border-[var(--color-border)] shadow-sm overflow-hidden p-6 space-y-4">
		<div class="flex items-center justify-between">
			<div>
				<h2 class="font-bold text-base flex items-center gap-2">
					<ShieldCheck class="w-4 h-4 text-purple-600" />
					Audit Event Journal ({filteredLogs.length})
				</h2>
				<p class="text-xs text-[var(--color-text-secondary)] mt-0.5">
					High-resolution chronological timeline of administrative state changes.
				</p>
			</div>
		</div>

		<div class="overflow-x-auto">
			<table class="w-full text-left text-xs">
				<thead>
					<tr class="border-b border-[var(--color-border)] text-[var(--color-text-secondary)] font-bold uppercase tracking-wider text-[10px]">
						<th class="py-3 px-4">Timestamp (UTC)</th>
						<th class="py-3 px-4">User Email</th>
						<th class="py-3 px-4">Action Type</th>
						<th class="py-3 px-4">Record Type</th>
						<th class="py-3 px-4 text-center">Payload Details</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-[var(--color-border)]">
					{#if filteredLogs.length === 0}
						<tr>
							<td colspan="5" class="py-8 text-center text-xs text-[var(--color-text-secondary)]">
								No audit logs matched your search criteria.
							</td>
						</tr>
					{:else}
						{#each filteredLogs as log}
							<tr class="hover:bg-[var(--color-border)]/20 transition-colors">
								<td class="py-3 px-4 font-mono text-xs text-[var(--color-text-secondary)]">
									{new Date(log.timestamp).toISOString().replace('T', ' ').slice(0, 19)}
								</td>
								<td class="py-3 px-4 text-xs font-semibold">{log.userEmail}</td>
								<td class="py-3 px-4">
									<span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300">
										{log.actionType}
									</span>
								</td>
								<td class="py-3 px-4 font-mono text-xs text-[var(--color-text-secondary)]">
									{log.recordType || '—'}
								</td>
								<td class="py-3 px-4 text-center">
									<button
										type="button"
										onclick={() => (inspectingLog = log)}
										class="btn btn-xs btn-ghost text-xs font-mono flex items-center gap-1 mx-auto"
									>
										<FileCode class="w-3.5 h-3.5" /> View JSON
									</button>
								</td>
							</tr>
						{/each}
					{/if}
				</tbody>
			</table>
		</div>
	</div>
</div>

<!-- Audit JSON Inspector Modal -->
{#if inspectingLog}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
		<div class="bg-[var(--color-bg-surface)] border border-[var(--color-border)] rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
			<div class="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
				<div>
					<h3 class="font-extrabold text-base">Audit Payload: {inspectingLog.actionType}</h3>
					<p class="text-[11px] text-[var(--color-text-secondary)] font-mono">
						Recorded at {new Date(inspectingLog.timestamp).toISOString()} by {inspectingLog.userEmail}
					</p>
				</div>
				<button type="button" onclick={() => (inspectingLog = null)} class="p-1 rounded-lg hover:bg-[var(--color-border)]/40"><X class="w-4 h-4" /></button>
			</div>
			<div class="space-y-2">
				<div class="flex justify-between items-center text-xs">
					<span class="font-bold text-[var(--color-text-secondary)]">JSON State Changes:</span>
					<button type="button" onclick={() => copyJson(JSON.parse(inspectingLog.details || '{}'))} class="text-[var(--color-primary)] font-bold text-xs flex items-center gap-1 hover:underline">
						{#if copied}<Check class="w-3.5 h-3.5 text-emerald-600" /> Copied{:else}<Copy class="w-3.5 h-3.5" /> Copy JSON{/if}
					</button>
				</div>
				<pre class="bg-[var(--color-bg-base)] border border-[var(--color-border)] rounded-xl p-3 font-mono text-xs overflow-x-auto max-h-72 text-[var(--color-text-primary)]">
{JSON.stringify(JSON.parse(inspectingLog.details || '{}'), null, 2)}
				</pre>
			</div>
			<div class="flex justify-end pt-2 border-t border-[var(--color-border)]">
				<button type="button" onclick={() => (inspectingLog = null)} class="px-4 py-2 rounded-xl text-xs font-bold border border-[var(--color-border)]">Close</button>
			</div>
		</div>
	</div>
{/if}
