<script lang="ts">
	import {
		Users,
		Landmark,
		Plus,
		Pencil,
		Search,
		ShieldCheck,
		AlertCircle,
		CheckCircle2,
		X,
		Archive,
		ArchiveRestore,
		Trash2,
		TriangleAlert,
		Palette,
		Check
	} from 'lucide-svelte';
	import { enhance } from '$app/forms';
	import { PLO_MEMBER_PALETTE, getMemberColor } from '$lib/constants/member-colors';

	let { data, form } = $props();

	let searchQuery = $state('');
	let showNewMemberModal = $state(false);
	let showNewPortionModal = $state(false);

	// Form values for Member creation
	let newMemberName = $state('');
	let newMemberEmail = $state('');
	let newMemberUsername = $state('');
	let newMemberPhone = $state('');
	let newMemberPassword = $state('Password123!');
	let newMemberRoles = $state<string[]>(['main_plo']);

	// Form values for Portion creation
	let portionUserId = $state('');
	let portionName = $state('');
	let portionHectares = $state('');
	let portionBps = $state('');
	let portionNotes = $state('');

	// Edit User State
	let showEditMemberModal = $state(false);
	let editUserId = $state('');
	let editMemberName = $state('');
	let editMemberEmail = $state('');
	let editMemberUsername = $state('');
	let editMemberPhone = $state('');
	let editMemberPassword = $state('');
	let editMemberRoles = $state<string[]>([]);
	let editMemberStatus = $state('active');
	let editMemberColor = $state('#2563eb');

	function openEditUser(u: any) {
		editUserId = u.id;
		editMemberName = u.name || '';
		editMemberEmail = u.email || '';
		editMemberUsername = u.username || '';
		editMemberPhone = u.phone || '';
		editMemberPassword = '';
		editMemberRoles = Array.isArray(u.roles) ? [...u.roles] : ['main_plo'];
		editMemberStatus = u.status || 'active';
		editMemberColor = u.color || getMemberColor(u);
		showEditMemberModal = true;
	}

	function toggleRole(role: string) {
		if (editMemberRoles.includes(role)) {
			editMemberRoles = editMemberRoles.filter((r) => r !== role);
		} else {
			editMemberRoles = [...editMemberRoles, role];
		}
	}

	// Edit Portion State
	let showEditPortionModal = $state(false);
	let editPortionId = $state('');
	let editPortionUserId = $state('');
	let editPortionName = $state('');
	let editPortionHectares = $state('');
	let editPortionBps = $state('');
	let editPortionStatus = $state('active');
	let editPortionNotes = $state('');

	function openEditPortion(p: any) {
		editPortionId = p.id;
		editPortionUserId = p.userId || '';
		editPortionName = p.portionName || '';
		editPortionHectares = p.hectares !== undefined ? p.hectares.toString() : '';
		editPortionBps = p.ownershipBps !== undefined ? p.ownershipBps.toString() : '';
		editPortionStatus = p.status || 'active';
		editPortionNotes = p.notes || '';
		showEditPortionModal = true;
	}

	// Delete Confirmation Modal State
	let showDeleteModal = $state(false);
	let deleteTargetType = $state<'user' | 'portion'>('user');
	let deleteTargetId = $state('');
	let deleteTargetName = $state('');

	function promptDeleteUser(id: string, name: string) {
		deleteTargetType = 'user';
		deleteTargetId = id;
		deleteTargetName = name;
		showDeleteModal = true;
	}

	function promptDeletePortion(id: string, name: string) {
		deleteTargetType = 'portion';
		deleteTargetId = id;
		deleteTargetName = name;
		showDeleteModal = true;
	}

	const filteredUsers = $derived(
		(data.users || []).filter((u: any) => {
			const q = searchQuery.trim().toLowerCase();
			if (!q) return true;
			return (
				u.name.toLowerCase().includes(q) ||
				u.email.toLowerCase().includes(q) ||
				(u.username && u.username.toLowerCase().includes(q))
			);
		})
	);
</script>

<svelte:head>
	<title>Landowners & Cadastral Portions — ACNRPLO</title>
</svelte:head>

<div class="space-y-6">
	<!-- Section Title & Sub-Nav Header -->
	<div class="bg-[var(--color-bg-surface)] border border-[var(--color-border)] rounded-2xl p-4 sm:p-6 shadow-sm">
		<div>
			<div class="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-purple-700 dark:text-purple-400">
				<Users class="w-4 h-4" />
				Cadastral Registry & Membership
			</div>
			<h1 class="text-2xl sm:text-3xl font-extrabold tracking-tight mt-1">
				Landowners & Portions
			</h1>
			<p class="text-xs sm:text-sm text-[var(--color-text-secondary)] mt-1 max-w-2xl">
				Manage verified reserve landowners, cadastral portion boundaries, basis-point voting rights, and linked family associates.
			</p>
		</div>

		<!-- Cadastral Invariant Meter -->
		<div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6 pt-6 border-t border-[var(--color-border)]">
			<div class="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-base)]/50 space-y-1">
				<div class="flex items-center justify-between text-xs font-bold text-[var(--color-text-secondary)]">
					<span>Reserve Land Distribution</span>
					<span class="font-mono text-emerald-600 font-bold">{data.stats.totalPercentage}%</span>
				</div>
				<div class="w-full bg-[var(--color-border)]/50 h-2.5 rounded-full overflow-hidden">
					<div
						class="h-full rounded-full transition-all duration-500 {data.stats.totalBps === 10000 ? 'bg-emerald-600' : 'bg-amber-600'}"
						style="width: {Math.min(100, data.stats.totalPercentage)}%"
					></div>
				</div>
				<div class="text-[11px] text-[var(--color-text-secondary)]">
					{data.stats.totalBps} / 10,000 bps invariant satisfied
				</div>
			</div>

			<div class="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-base)]/50 space-y-1">
				<div class="text-xs font-bold text-[var(--color-text-secondary)]">Total Surveyed Reserve Area</div>
				<div class="text-xl font-extrabold">{data.stats.totalHectares.toLocaleString()} ha</div>
				<div class="text-[11px] text-[var(--color-text-secondary)]">Across {data.portions.length} surveyed cadastral portions</div>
			</div>

			<div class="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-base)]/50 space-y-1">
				<div class="text-xs font-bold text-[var(--color-text-secondary)]">Registered Landowners</div>
				<div class="text-xl font-extrabold">{data.users.length}</div>
				<div class="text-[11px] text-[var(--color-text-secondary)]">
					{data.users.filter((u: any) => u.status === 'active').length} active, {data.associates.length} linked associates
				</div>
			</div>
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
			<span>Administrative record committed and audited.</span>
		</div>
	{/if}

	<!-- Search & Landowners Table -->
	<div class="bg-[var(--color-bg-surface)] rounded-2xl border border-[var(--color-border)] shadow-sm overflow-hidden space-y-4 p-6">
		<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
			<div>
				<h2 class="font-bold text-base flex items-center gap-2">
					<Users class="w-4 h-4 text-[var(--color-primary)]" />
					Registered Landowners ({filteredUsers.length})
				</h2>
				<p class="text-xs text-[var(--color-text-secondary)] mt-0.5">
					Official landowner roster governing voting quorum, quota shares, and reserve access.
				</p>
			</div>
			<div class="flex items-center gap-2 w-full sm:w-auto">
				<div class="relative flex-1 sm:w-64">
					<Search class="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]" />
					<input
						type="text"
						placeholder="Search landowners..."
						bind:value={searchQuery}
						class="input input-bordered input-sm w-full pl-9 text-xs rounded-xl"
					/>
				</div>
				<button
					type="button"
					onclick={() => (showNewMemberModal = true)}
					title="Onboard Landowner"
					aria-label="Onboard Landowner"
					class="w-8 h-8 rounded-xl bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary)]/90 flex items-center justify-center transition-colors shadow-xs shrink-0"
				>
					<Plus class="w-4 h-4" />
				</button>
			</div>
		</div>

		<div class="overflow-x-auto">
			<table class="w-full text-left text-xs">
				<thead>
					<tr class="border-b border-[var(--color-border)] text-[var(--color-text-secondary)] font-bold uppercase tracking-wider text-[10px]">
						<th class="py-3 px-4">Member Name</th>
						<th class="py-3 px-4">Contact Info</th>
						<th class="py-3 px-4">Roles</th>
						<th class="py-3 px-4">Assigned Portions</th>
						<th class="py-3 px-4">Surface (Ha)</th>
						<th class="py-3 px-4">Voting Power (BPS)</th>
						<th class="py-3 px-4">Status</th>
						<th class="py-3 px-4 text-right">Action</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-[var(--color-border)]">
					{#each filteredUsers as u}
						<tr
							onclick={() => openEditUser(u)}
							class="hover:bg-[var(--color-border)]/30 active:bg-[var(--color-border)]/40 transition-colors cursor-pointer select-none group"
							title="Click or tap to edit {u.name}"
						>
							<td class="py-3 px-4 font-bold text-xs">
								<div class="flex items-center gap-2.5">
									<div class="w-7 h-7 rounded-full text-white flex items-center justify-center font-bold text-[11px] shrink-0 shadow-2xs border border-black/10" style="background-color: {u.color || getMemberColor(u)}">
										{u.name.charAt(0).toUpperCase()}
									</div>
									<div>
										<div class="flex items-center gap-1.5">
											<span>{u.name}</span>
											<span class="w-2.5 h-2.5 rounded-full border border-black/10 shrink-0" style="background-color: {u.color || getMemberColor(u)}" title="Calendar color: {u.color || getMemberColor(u)}"></span>
											<Pencil class="w-3 h-3 text-[var(--color-text-secondary)] opacity-0 group-hover:opacity-100 transition-opacity" />
										</div>
										{#if u.username}
											<span class="text-[10px] text-[var(--color-text-secondary)] block font-mono font-normal">@{u.username}</span>
										{/if}
									</div>
								</div>
							</td>
							<td class="py-3 px-4 font-mono text-xs">
								<div>{u.email}</div>
								{#if u.phone}
									<div class="text-[10px] text-[var(--color-text-secondary)]">{u.phone}</div>
								{/if}
							</td>
							<td class="py-3 px-4">
								<div class="flex flex-wrap gap-1">
									{#each u.roles as role}
										<span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider {role === 'secretary' ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300' : role === 'executive' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' : role === 'main_plo' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : role === 'associate' ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300' : 'bg-stone-100 text-stone-700'}">
											{role.replace('_', ' ')}
										</span>
									{/each}
								</div>
							</td>
							<td class="py-3 px-4 font-mono text-xs">
								{#if u.portions && u.portions.length > 0}
									<div class="space-y-0.5">
										{#each u.portions as p}
											<div class="text-[11px] font-semibold">{p.portionName}</div>
										{/each}
									</div>
								{:else}
									<span class="text-[var(--color-text-secondary)] italic">None</span>
								{/if}
							</td>
							<td class="py-3 px-4 font-mono font-semibold">
								{u.hectares ? `${u.hectares.toLocaleString()} ha` : '—'}
							</td>
							<td class="py-3 px-4 font-mono font-bold text-[var(--color-primary)]">
								{u.ownershipBps ? `${u.ownershipBps} bps (${u.ownershipPercentage.toFixed(1)}%)` : '0 bps (0.0%)'}
							</td>
							<td class="py-3 px-4">
								<span class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase {u.status === 'active' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : u.status === 'archived' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'}">
									{u.status}
								</span>
							</td>
							<td class="py-3 px-4 text-right">
								<div class="flex items-center justify-end gap-1.5" onclick={(e) => e.stopPropagation()}>
									<button
										type="button"
										onclick={() => openEditUser(u)}
										title="Edit {u.name}"
										class="btn btn-xs btn-ghost text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 rounded-lg flex items-center gap-1 font-bold"
									>
										<Pencil class="w-3 h-3" /> Edit
									</button>
									{#if u.status !== 'archived'}
										<form method="POST" action="?/archiveUser" use:enhance>
											<input type="hidden" name="userId" value={u.id} />
											<button
												type="submit"
												class="btn btn-xs btn-ghost text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded-lg font-bold flex items-center gap-1"
												title="Archive user (required before deletion)"
											>
												<Archive class="w-3 h-3" /> Archive
											</button>
										</form>
									{:else}
										<form method="POST" action="?/restoreUser" use:enhance>
											<input type="hidden" name="userId" value={u.id} />
											<button
												type="submit"
												class="btn btn-xs btn-ghost text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg font-bold flex items-center gap-1"
												title="Restore user to active"
											>
												<ArchiveRestore class="w-3 h-3" /> Restore
											</button>
										</form>
										<button
											type="button"
											onclick={() => promptDeleteUser(u.id, u.name)}
											class="btn btn-xs btn-ghost text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg font-bold flex items-center gap-1"
											title="Permanently delete user"
										>
											<Trash2 class="w-3 h-3" /> Delete
										</button>
									{/if}
								</div>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>

	<!-- Cadastral Land Portions Master Table -->
	<div class="bg-[var(--color-bg-surface)] rounded-2xl border border-[var(--color-border)] shadow-sm overflow-hidden p-6 space-y-4">
		<div class="flex items-center justify-between">
			<div>
				<h2 class="font-bold text-base flex items-center gap-2">
					<Landmark class="w-4 h-4 text-amber-600" />
					Cadastral Portions Register ({data.portions.length})
				</h2>
				<p class="text-xs text-[var(--color-text-secondary)] mt-0.5">
					Surveyed title portions composing the 10,000 hectare reserve perimeter.
				</p>
			</div>
			<button
				type="button"
				onclick={() => (showNewPortionModal = true)}
				title="Assign Portion"
				aria-label="Assign Portion"
				class="w-8 h-8 rounded-xl bg-[var(--color-secondary)] text-white hover:bg-[var(--color-secondary)]/90 flex items-center justify-center transition-colors shadow-xs shrink-0"
			>
				<Plus class="w-4 h-4" />
			</button>
		</div>

		<div class="overflow-x-auto">
			<table class="w-full text-left text-xs">
				<thead>
					<tr class="border-b border-[var(--color-border)] text-[var(--color-text-secondary)] font-bold uppercase tracking-wider text-[10px]">
						<th class="py-3 px-4">Portion Name</th>
						<th class="py-3 px-4">Registered Landowner</th>
						<th class="py-3 px-4">Surface (Ha)</th>
						<th class="py-3 px-4">Ownership Share (BPS)</th>
						<th class="py-3 px-4">Voting Weight (BPS)</th>
						<th class="py-3 px-4">Status</th>
						<th class="py-3 px-4 text-right">Action</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-[var(--color-border)]">
					{#each data.portions as p}
						<tr
							onclick={() => openEditPortion(p)}
							class="hover:bg-[var(--color-border)]/30 active:bg-[var(--color-border)]/40 transition-colors cursor-pointer select-none group"
							title="Click or tap to edit {p.portionName}"
						>
							<td class="py-3 px-4 font-bold text-xs">
								<div class="flex items-center gap-1.5">
									<span>{p.portionName}</span>
									<Pencil class="w-3 h-3 text-[var(--color-text-secondary)] opacity-0 group-hover:opacity-100 transition-opacity" />
								</div>
								{#if p.notes}
									<div class="text-[10px] text-[var(--color-text-secondary)] font-normal">{p.notes}</div>
								{/if}
							</td>
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
								<span class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase {p.status === 'active' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : p.status === 'archived' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' : 'bg-stone-100 text-stone-700 dark:bg-stone-900 dark:text-stone-300'}">
									{p.status}
								</span>
							</td>
							<td class="py-3 px-4 text-right">
								<div class="flex items-center justify-end gap-1.5" onclick={(e) => e.stopPropagation()}>
									<button
										type="button"
										onclick={() => openEditPortion(p)}
										title="Edit {p.portionName}"
										class="btn btn-xs btn-ghost text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded-lg flex items-center gap-1 font-bold"
									>
										<Pencil class="w-3 h-3" /> Edit
									</button>
									{#if p.status !== 'archived'}
										<form method="POST" action="?/archivePortion" use:enhance>
											<input type="hidden" name="portionId" value={p.id} />
											<button
												type="submit"
												class="btn btn-xs btn-ghost text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded-lg font-bold flex items-center gap-1"
												title="Archive portion (required before deletion)"
											>
												<Archive class="w-3 h-3" /> Archive
											</button>
										</form>
									{:else}
										<form method="POST" action="?/restorePortion" use:enhance>
											<input type="hidden" name="portionId" value={p.id} />
											<button
												type="submit"
												class="btn btn-xs btn-ghost text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg font-bold flex items-center gap-1"
												title="Restore portion to active"
											>
												<ArchiveRestore class="w-3 h-3" /> Restore
											</button>
										</form>
										<button
											type="button"
											onclick={() => promptDeletePortion(p.id, p.portionName)}
											class="btn btn-xs btn-ghost text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg font-bold flex items-center gap-1"
											title="Permanently delete portion"
										>
											<Trash2 class="w-3 h-3" /> Delete
										</button>
									{/if}
								</div>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>
</div>

<!-- 1. Onboard Member Modal -->
{#if showNewMemberModal}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
		<div class="bg-[var(--color-bg-surface)] border border-[var(--color-border)] rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
			<div class="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
				<h3 class="font-extrabold text-base">Onboard New Landowner</h3>
				<button type="button" onclick={() => (showNewMemberModal = false)} class="p-1 rounded-lg hover:bg-[var(--color-border)]/40"><X class="w-4 h-4" /></button>
			</div>
			<form method="POST" action="?/createUser" use:enhance={() => async ({ result, update }) => { if (result.type === 'success') showNewMemberModal = false; await update(); }} class="space-y-4">
				<div class="grid grid-cols-2 gap-3">
					<div class="space-y-1">
						<label class="text-xs font-bold text-[var(--color-text-secondary)]">Full Name</label>
						<input type="text" name="name" required placeholder="e.g. Willem Botha" bind:value={newMemberName} class="input input-bordered input-sm w-full text-xs" />
					</div>
					<div class="space-y-1">
						<label class="text-xs font-bold text-[var(--color-text-secondary)]">Email Address</label>
						<input type="email" name="email" required placeholder="botha@farm.co.za" bind:value={newMemberEmail} class="input input-bordered input-sm w-full text-xs font-mono" />
					</div>
				</div>
				<div class="grid grid-cols-2 gap-3">
					<div class="space-y-1">
						<label class="text-xs font-bold text-[var(--color-text-secondary)]">Username</label>
						<input type="text" name="username" placeholder="willembotha" bind:value={newMemberUsername} class="input input-bordered input-sm w-full text-xs font-mono" />
					</div>
					<div class="space-y-1">
						<label class="text-xs font-bold text-[var(--color-text-secondary)]">Initial Password</label>
						<input type="password" name="password" required bind:value={newMemberPassword} class="input input-bordered input-sm w-full text-xs font-mono" />
					</div>
				</div>
				<div class="space-y-1">
					<label class="text-xs font-bold text-[var(--color-text-secondary)]">Assigned Stackable Roles</label>
					<div class="flex flex-wrap gap-2 pt-1">
						<label class="flex items-center gap-1.5 text-xs">
							<input type="checkbox" name="roles" value="main_plo" checked class="checkbox checkbox-xs" /> Main PLO
						</label>
						<label class="flex items-center gap-1.5 text-xs">
							<input type="checkbox" name="roles" value="executive" class="checkbox checkbox-xs" /> Executive
						</label>
						<label class="flex items-center gap-1.5 text-xs">
							<input type="checkbox" name="roles" value="secretary" class="checkbox checkbox-xs" /> Secretary
						</label>
					</div>
				</div>
				<div class="flex justify-end gap-2 pt-2 border-t border-[var(--color-border)]">
					<button type="button" onclick={() => (showNewMemberModal = false)} class="px-4 py-2 rounded-xl text-xs font-bold border border-[var(--color-border)]">Cancel</button>
					<button type="submit" class="btn bg-[var(--color-primary)] text-white border-0 text-xs font-bold px-4 py-2 rounded-xl">Create Account</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- 2. Assign Portion Modal -->
{#if showNewPortionModal}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
		<div class="bg-[var(--color-bg-surface)] border border-[var(--color-border)] rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
			<div class="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
				<h3 class="font-extrabold text-base">Assign Cadastral Land Portion</h3>
				<button type="button" onclick={() => (showNewPortionModal = false)} class="p-1 rounded-lg hover:bg-[var(--color-border)]/40"><X class="w-4 h-4" /></button>
			</div>
			<form method="POST" action="?/createPortion" use:enhance={() => async ({ result, update }) => { if (result.type === 'success') showNewPortionModal = false; await update(); }} class="space-y-4">
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
					<input type="text" name="portionName" required placeholder="e.g. Portion 5 (Wildebeespan)" bind:value={portionName} class="input input-bordered input-sm w-full text-xs" />
				</div>
				<div class="grid grid-cols-2 gap-3">
					<div class="space-y-1">
						<label class="text-xs font-bold text-[var(--color-text-secondary)]">Surface (Hectares)</label>
						<input type="number" step="0.1" name="hectares" required placeholder="1250" bind:value={portionHectares} class="input input-bordered input-sm w-full text-xs font-mono" />
					</div>
					<div class="space-y-1">
						<label class="text-xs font-bold text-[var(--color-text-secondary)]">Basis Points (100 bps = 1%)</label>
						<input type="number" name="ownershipBps" required placeholder="1250" bind:value={portionBps} class="input input-bordered input-sm w-full text-xs font-mono font-bold" />
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

<!-- 3. Edit Member / Landowner Modal -->
{#if showEditMemberModal}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
		<div class="bg-[var(--color-bg-surface)] border border-[var(--color-border)] rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
			<div class="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
				<div class="flex items-center gap-2">
					<Users class="w-5 h-5 text-[var(--color-primary)]" />
					<h3 class="font-extrabold text-base">Edit Landowner Account</h3>
				</div>
				<button type="button" onclick={() => (showEditMemberModal = false)} class="p-1 rounded-lg hover:bg-[var(--color-border)]/40"><X class="w-4 h-4" /></button>
			</div>
			<form method="POST" action="?/updateUser" use:enhance={() => async ({ result, update }) => { if (result.type === 'success') showEditMemberModal = false; await update(); }} class="space-y-4">
				<input type="hidden" name="userId" value={editUserId} />

				<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
					<div class="space-y-1">
						<label for="edit-member-name" class="text-xs font-bold text-[var(--color-text-secondary)]">Full Name</label>
						<input id="edit-member-name" type="text" name="name" required placeholder="e.g. Willem Botha" bind:value={editMemberName} class="input input-bordered input-sm w-full text-xs font-bold" />
					</div>
					<div class="space-y-1">
						<label for="edit-member-email" class="text-xs font-bold text-[var(--color-text-secondary)]">Email Address</label>
						<input id="edit-member-email" type="email" name="email" required placeholder="botha@farm.co.za" bind:value={editMemberEmail} class="input input-bordered input-sm w-full text-xs font-mono" />
					</div>
				</div>

				<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
					<div class="space-y-1">
						<label for="edit-member-username" class="text-xs font-bold text-[var(--color-text-secondary)]">Username</label>
						<input id="edit-member-username" type="text" name="username" placeholder="willembotha" bind:value={editMemberUsername} class="input input-bordered input-sm w-full text-xs font-mono" />
					</div>
					<div class="space-y-1">
						<label for="edit-member-phone" class="text-xs font-bold text-[var(--color-text-secondary)]">Phone Number</label>
						<input id="edit-member-phone" type="text" name="phone" placeholder="+27 82 123 4567" bind:value={editMemberPhone} class="input input-bordered input-sm w-full text-xs font-mono" />
					</div>
				</div>

				<!-- Password Update -->
				<div class="space-y-1 p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-base)]/40">
					<label for="edit-member-password" class="text-xs font-bold text-[var(--color-text-secondary)] flex items-center justify-between">
						<span>Change Password</span>
						<span class="text-[10px] font-normal text-[var(--color-text-secondary)]">Optional</span>
					</label>
					<input id="edit-member-password" type="password" name="password" placeholder="Leave blank to keep unchanged" bind:value={editMemberPassword} class="input input-bordered input-sm w-full text-xs font-mono" />
					<p class="text-[10px] text-[var(--color-text-secondary)]">Enter a new password only if you want to reset or update this account's password.</p>
				</div>

				<!-- Roles -->
				<div class="space-y-1.5">
					<label class="text-xs font-bold text-[var(--color-text-secondary)] block">Assigned Stackable Roles</label>
					<div class="grid grid-cols-2 gap-2 p-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-base)]/30">
						<label class="flex items-start gap-2 p-1.5 rounded-lg hover:bg-[var(--color-border)]/20 cursor-pointer">
							<input type="checkbox" name="roles" value="main_plo" checked={editMemberRoles.includes('main_plo')} onchange={() => toggleRole('main_plo')} class="checkbox checkbox-xs mt-0.5" />
							<div>
								<span class="text-xs font-bold block">Main PLO</span>
								<span class="text-[10px] text-[var(--color-text-secondary)] block leading-tight">Landowner rights & voting</span>
							</div>
						</label>
						<label class="flex items-start gap-2 p-1.5 rounded-lg hover:bg-[var(--color-border)]/20 cursor-pointer">
							<input type="checkbox" name="roles" value="executive" checked={editMemberRoles.includes('executive')} onchange={() => toggleRole('executive')} class="checkbox checkbox-xs mt-0.5" />
							<div>
								<span class="text-xs font-bold block">Executive</span>
								<span class="text-[10px] text-[var(--color-text-secondary)] block leading-tight">Finance & governance</span>
							</div>
						</label>
						<label class="flex items-start gap-2 p-1.5 rounded-lg hover:bg-[var(--color-border)]/20 cursor-pointer">
							<input type="checkbox" name="roles" value="secretary" checked={editMemberRoles.includes('secretary')} onchange={() => toggleRole('secretary')} class="checkbox checkbox-xs mt-0.5" />
							<div>
								<span class="text-xs font-bold block">Secretary</span>
								<span class="text-[10px] text-[var(--color-text-secondary)] block leading-tight">Administration & polls</span>
							</div>
						</label>
						<label class="flex items-start gap-2 p-1.5 rounded-lg hover:bg-[var(--color-border)]/20 cursor-pointer">
							<input type="checkbox" name="roles" value="associate" checked={editMemberRoles.includes('associate')} onchange={() => toggleRole('associate')} class="checkbox checkbox-xs mt-0.5" />
							<div>
								<span class="text-xs font-bold block">Associate</span>
								<span class="text-[10px] text-[var(--color-text-secondary)] block leading-tight">Family guest member</span>
							</div>
						</label>
					</div>
				</div>

				<!-- Calendar Color Assignment -->
				<div class="space-y-1.5 p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-base)]/40">
					<div class="flex items-center justify-between">
						<label for="edit-member-color" class="text-xs font-bold text-[var(--color-text-secondary)] flex items-center gap-1.5">
							<Palette class="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
							<span>Calendar Member Color</span>
						</label>
						<span class="text-[10px] font-mono font-bold px-2 py-0.5 rounded border border-[var(--color-border)] bg-[var(--color-bg-surface)] flex items-center gap-1.5">
							<span class="w-2.5 h-2.5 rounded-full border border-black/10 shrink-0" style="background-color: {editMemberColor}"></span>
							{editMemberColor}
						</span>
					</div>
					<p class="text-[10px] text-[var(--color-text-secondary)]">
						Color assigned to this landowner to identify visits on the shared Field Operations calendar and legend.
					</p>
					<div class="flex flex-wrap items-center gap-2 pt-1">
						{#each PLO_MEMBER_PALETTE as palColor}
							<button
								type="button"
								onclick={() => (editMemberColor = palColor)}
								class="w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 flex items-center justify-center {editMemberColor.toLowerCase() === palColor.toLowerCase() ? 'ring-2 ring-offset-2 ring-black dark:ring-white border-white scale-110' : 'border-black/10'}"
								style="background-color: {palColor}"
								title="Select {palColor}"
							>
								{#if editMemberColor.toLowerCase() === palColor.toLowerCase()}
									<Check class="w-3 h-3 text-white" />
								{/if}
							</button>
						{/each}
						<input
							id="edit-member-color"
							type="color"
							bind:value={editMemberColor}
							class="w-6 h-6 rounded-full cursor-pointer border border-[var(--color-border)] bg-transparent p-0 ml-1"
							title="Custom hex color"
						/>
					</div>
					<input type="hidden" name="color" value={editMemberColor} />
				</div>

				<!-- Account Status -->
				<div class="space-y-1">
					<label for="edit-member-status" class="text-xs font-bold text-[var(--color-text-secondary)]">Account Status</label>
					<select id="edit-member-status" name="status" bind:value={editMemberStatus} class="select select-bordered select-sm w-full text-xs font-bold">
						<option value="active">Active (Full Access)</option>
						<option value="archived">Archived (Blocked & Eligible for Deletion)</option>
						<option value="inactive">Inactive / Suspended (Blocked)</option>
					</select>
				</div>

				<div class="flex items-center justify-between pt-3 border-t border-[var(--color-border)]">
					{#if editMemberStatus === 'archived'}
						<button
							type="button"
							onclick={() => { showEditMemberModal = false; promptDeleteUser(editUserId, editMemberName); }}
							class="btn btn-xs btn-outline btn-error font-bold flex items-center gap-1"
						>
							<Trash2 class="w-3.5 h-3.5" /> Delete User
						</button>
					{:else}
						<span class="text-[11px] text-[var(--color-text-secondary)] italic">
							(Archive user first to enable deletion)
						</span>
					{/if}
					<div class="flex items-center gap-2">
						<button type="button" onclick={() => (showEditMemberModal = false)} class="px-4 py-2 rounded-xl text-xs font-bold border border-[var(--color-border)] hover:bg-[var(--color-border)]/30">Cancel</button>
						<button type="submit" class="btn bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary)]/90 border-0 text-xs font-bold px-4 py-2 rounded-xl">Save Changes</button>
					</div>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- 4. Edit Cadastral Land Portion Modal -->
{#if showEditPortionModal}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
		<div class="bg-[var(--color-bg-surface)] border border-[var(--color-border)] rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
			<div class="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
				<div class="flex items-center gap-2">
					<Landmark class="w-5 h-5 text-amber-600" />
					<h3 class="font-extrabold text-base">Edit Cadastral Land Portion</h3>
				</div>
				<button type="button" onclick={() => (showEditPortionModal = false)} class="p-1 rounded-lg hover:bg-[var(--color-border)]/40"><X class="w-4 h-4" /></button>
			</div>
			<form method="POST" action="?/updatePortion" use:enhance={() => async ({ result, update }) => { if (result.type === 'success') showEditPortionModal = false; await update(); }} class="space-y-4">
				<input type="hidden" name="portionId" value={editPortionId} />

				<div class="space-y-1">
					<label for="edit-portion-owner" class="text-xs font-bold text-[var(--color-text-secondary)]">Registered Landowner</label>
					<select id="edit-portion-owner" name="userId" bind:value={editPortionUserId} class="select select-bordered select-sm w-full text-xs">
						<option value="">Unassigned Reserve Land</option>
						{#each data.users as u}
							<option value={u.id}>{u.name} ({u.email})</option>
						{/each}
					</select>
				</div>

				<div class="space-y-1">
					<label for="edit-portion-name" class="text-xs font-bold text-[var(--color-text-secondary)]">Portion Cadastral Name</label>
					<input id="edit-portion-name" type="text" name="portionName" required placeholder="e.g. Groengoud, Frankfort, Buffelsvlei" bind:value={editPortionName} class="input input-bordered input-sm w-full text-xs font-bold" />
				</div>

				<div class="grid grid-cols-2 gap-3">
					<div class="space-y-1">
						<label for="edit-portion-hectares" class="text-xs font-bold text-[var(--color-text-secondary)]">Surface (Hectares)</label>
						<input id="edit-portion-hectares" type="number" step="0.1" name="hectares" required placeholder="1035" bind:value={editPortionHectares} class="input input-bordered input-sm w-full text-xs font-mono font-bold" />
					</div>
					<div class="space-y-1">
						<label for="edit-portion-bps" class="text-xs font-bold text-[var(--color-text-secondary)]">Basis Points (100 bps = 1%)</label>
						<input id="edit-portion-bps" type="number" name="ownershipBps" required placeholder="1035" bind:value={editPortionBps} class="input input-bordered input-sm w-full text-xs font-mono font-bold" />
					</div>
				</div>

				<div class="space-y-1">
					<label for="edit-portion-status" class="text-xs font-bold text-[var(--color-text-secondary)]">Portion Status</label>
					<select id="edit-portion-status" name="status" bind:value={editPortionStatus} class="select select-bordered select-sm w-full text-xs font-bold">
						<option value="active">Active (Enrolled in Reserve)</option>
						<option value="archived">Archived (Withdrawn & Eligible for Deletion)</option>
						<option value="inactive">Inactive / Boundary Disputed</option>
					</select>
				</div>

				<div class="space-y-1">
					<label for="edit-portion-notes" class="text-xs font-bold text-[var(--color-text-secondary)]">Survey Notes / Title Deed Ref</label>
					<input id="edit-portion-notes" type="text" name="notes" placeholder="e.g. Title Deed T12345/2020, SG Diagram 44/1998" bind:value={editPortionNotes} class="input input-bordered input-sm w-full text-xs" />
				</div>

				<div class="flex items-center justify-between pt-3 border-t border-[var(--color-border)]">
					{#if editPortionStatus === 'archived'}
						<button
							type="button"
							onclick={() => { showEditPortionModal = false; promptDeletePortion(editPortionId, editPortionName); }}
							class="btn btn-xs btn-outline btn-error font-bold flex items-center gap-1"
						>
							<Trash2 class="w-3.5 h-3.5" /> Delete Portion
						</button>
					{:else}
						<span class="text-[11px] text-[var(--color-text-secondary)] italic">
							(Archive portion first to enable deletion)
						</span>
					{/if}
					<div class="flex items-center gap-2">
						<button type="button" onclick={() => (showEditPortionModal = false)} class="px-4 py-2 rounded-xl text-xs font-bold border border-[var(--color-border)] hover:bg-[var(--color-border)]/30">Cancel</button>
						<button type="submit" class="btn bg-[var(--color-secondary)] text-white hover:bg-[var(--color-secondary)]/90 border-0 text-xs font-bold px-4 py-2 rounded-xl">Save Changes</button>
					</div>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- 5. Delete Confirmation Modal -->
{#if showDeleteModal}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
		<div class="bg-[var(--color-bg-surface)] border border-[var(--color-border)] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
			<div class="flex items-center gap-3">
				<div class="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center shrink-0">
					<TriangleAlert class="w-5 h-5" />
				</div>
				<div>
					<h3 class="font-extrabold text-base text-rose-600 dark:text-rose-400">
						{deleteTargetType === 'user' ? 'Delete Landowner Account' : 'Delete Cadastral Portion'}
					</h3>
					<p class="text-xs text-[var(--color-text-secondary)]">Permanent, irreversible deletion</p>
				</div>
			</div>

			<div class="text-xs text-[var(--color-text-secondary)] space-y-2 py-1">
				{#if deleteTargetType === 'user'}
					<p>
						Are you sure you want to permanently delete landowner <strong>"{deleteTargetName}"</strong>?
					</p>
					<p class="text-[11px] bg-rose-50 dark:bg-rose-950/30 p-2.5 rounded-lg border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300">
						This will permanently delete the user login, authentication credentials, votes, and calendar entries. Any land portions registered to this owner will become Unassigned Reserve Land.
					</p>
				{:else}
					<p>
						Are you sure you want to permanently delete cadastral portion <strong>"{deleteTargetName}"</strong>?
					</p>
					<p class="text-[11px] bg-rose-50 dark:bg-rose-950/30 p-2.5 rounded-lg border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300">
						This surveyed title portion will be permanently purged from the cadastral register and reserve area totals.
					</p>
				{/if}
			</div>

			<form
				method="POST"
				action={deleteTargetType === 'user' ? '?/deleteUser' : '?/deletePortion'}
				use:enhance={() => async ({ result, update }) => {
					if (result.type === 'success') {
						showDeleteModal = false;
					}
					await update();
				}}
				class="flex justify-end gap-2 pt-2 border-t border-[var(--color-border)]"
			>
				{#if deleteTargetType === 'user'}
					<input type="hidden" name="userId" value={deleteTargetId} />
				{:else}
					<input type="hidden" name="portionId" value={deleteTargetId} />
				{/if}
				<button
					type="button"
					onclick={() => (showDeleteModal = false)}
					class="px-4 py-2 rounded-xl text-xs font-bold border border-[var(--color-border)] hover:bg-[var(--color-border)]/30"
				>
					Cancel
				</button>
				<button
					type="submit"
					class="btn btn-error text-white border-0 text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5"
				>
					<Trash2 class="w-3.5 h-3.5" /> Confirm Delete
				</button>
			</form>
		</div>
	</div>
{/if}
