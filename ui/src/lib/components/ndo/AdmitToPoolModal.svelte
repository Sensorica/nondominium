<script lang="ts">
  import type { ActionHash } from '@holochain/client';
  import { encodeHashToBase64 } from '@holochain/client';
  import { Modal, NdoButton } from '@nondominium/ndo-ui';
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

<Modal
  title="Admit to pool"
  subtitle="Any group you belong to can act as a Commitment Pool. Admission is a pointer on the group DHT — it does not move the commitment."
>
  {#snippet children()}
    <p class="mb-4 font-mono text-xs text-gray-500">
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
      <p class="mt-4 rounded border border-red-200 bg-red-50 p-2 text-sm text-red-700">{errorMessage}</p>
    {/if}
  {/snippet}
  {#snippet footer()}
    <NdoButton variant="ghost" onclick={onclose}>Cancel</NdoButton>
    <NdoButton
      disabled={isSubmitting || lobbyStore.groups.length === 0}
      onclick={() => void handleAdmit()}
    >
      {isSubmitting ? 'Admitting…' : 'Admit'}
    </NdoButton>
  {/snippet}
</Modal>
