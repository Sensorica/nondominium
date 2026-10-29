<script lang="ts">
  import type { ActionHash } from '@holochain/client';
  import { encodeHashToBase64 } from '@holochain/client';
  import { lobbyStore } from '$lib/stores/lobby.store.svelte';
  import { groupStore } from '$lib/stores/group.store.svelte';

  interface Props {
    identityHash: ActionHash;
    commitmentHash: ActionHash;
    onclose: () => void;
    onadmitted?: () => void;
  }

  let { identityHash, commitmentHash, onclose, onadmitted }: Props = $props();

  let selectedGroupId = $state('');
  let isSubmitting = $state(false);
  let errorMessage = $state('');

  $effect(() => {
    if (lobbyStore.groups.length === 0) {
      void lobbyStore.loadGroups();
    }
  });

  $effect(() => {
    if (!selectedGroupId && lobbyStore.groups.length > 0) {
      selectedGroupId = lobbyStore.groups[0].id;
    }
  });

  async function handleAdmit() {
    if (!selectedGroupId) {
      errorMessage = 'Pick a group to admit this commitment into.';
      return;
    }
    isSubmitting = true;
    errorMessage = '';
    const result = await groupStore.admitCommitment(selectedGroupId, identityHash, commitmentHash);
    isSubmitting = false;
    if (result.ok) {
      onadmitted?.();
      onclose();
    } else {
      errorMessage = result.cause;
    }
  }
</script>

<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
  <div
    class="relative w-full max-w-md rounded-xl border border-gray-200 bg-white shadow-xl"
    role="dialog"
    aria-modal="true"
    aria-labelledby="admit-pool-title"
  >
    <div class="border-b border-gray-100 px-6 py-4">
      <h2 id="admit-pool-title" class="text-lg font-semibold text-gray-900">Admit to pool</h2>
      <p class="mt-1 text-sm text-gray-500">
        Any group you belong to can act as a Commitment Pool. Admission is a pointer on the group
        DHT — it does not move the commitment.
      </p>
    </div>

    <div class="space-y-4 px-6 py-4">
      <p class="font-mono text-xs text-gray-500">
        {encodeHashToBase64(commitmentHash).slice(0, 16)}…
      </p>
      <div>
        <label class="mb-1 block text-sm font-medium text-gray-700" for="admit-group">Group</label>
        {#if lobbyStore.groups.length === 0}
          <p class="text-sm text-gray-500">No groups yet. Create or join a group from the Lobby.</p>
        {:else}
          <select
            id="admit-group"
            bind:value={selectedGroupId}
            class="w-full rounded border border-gray-300 px-3 py-2 text-sm"
          >
            {#each lobbyStore.groups as g (g.id)}
              <option value={g.id}>{g.name}</option>
            {/each}
          </select>
        {/if}
      </div>
      {#if errorMessage}
        <p class="rounded border border-red-200 bg-red-50 p-2 text-sm text-red-700">{errorMessage}</p>
      {/if}
    </div>

    <div class="flex justify-end gap-2 border-t border-gray-100 px-6 py-4">
      <button type="button" onclick={onclose} class="rounded px-4 py-2 text-sm text-gray-600 hover:bg-gray-100"
        >Cancel</button
      >
      <button
        type="button"
        disabled={isSubmitting || lobbyStore.groups.length === 0}
        onclick={handleAdmit}
        class="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {isSubmitting ? 'Admitting…' : 'Admit'}
      </button>
    </div>
  </div>
</div>
