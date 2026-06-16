<script lang="ts">
  import { onMount } from 'svelte';
  import { Effect as E, Exit, pipe } from 'effect';
  import { lobbyStore } from '$lib/stores/lobby.store.svelte';
  import { groupStore } from '$lib/stores/group.store.svelte';
  import { NdoServiceTag, NdoServiceResolved } from '$lib/services/zomes/ndo.service';

  type Props = {
    ndoHashB64: string;
    ndoName: string;
    onclose: () => void;
  };

  let { ndoHashB64, ndoName, onclose }: Props = $props();

  let selected = $state<Set<string>>(new Set());
  let saved = $state(false);
  let associatedIds = $state<Set<string>>(new Set());
  let loadingAssociations = $state(true);

  const availableGroups = $derived(lobbyStore.groups.filter((g) => !associatedIds.has(g.id)));

  onMount(() => {
    void (async () => {
      await lobbyStore.loadGroups();
      const exit = await E.runPromiseExit(
        pipe(
          E.gen(function* () {
            const svc = yield* NdoServiceTag;
            return yield* svc.getAssociatedGroupIds(ndoHashB64);
          }),
          E.provide(NdoServiceResolved)
        )
      );
      if (Exit.isSuccess(exit)) {
        associatedIds = new Set(exit.value);
      }
      loadingAssociations = false;
    })();
  });

  function toggle(id: string) {
    const next = new Set(selected);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    selected = next;
  }

  async function handleConfirm() {
    for (const gid of selected) {
      await groupStore.associateNdoWithGroup(ndoHashB64, gid);
    }
    await lobbyStore.loadNdos();
    saved = true;
    setTimeout(onclose, 600);
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') onclose();
  }
</script>

<div
  role="dialog"
  aria-modal="true"
  aria-label="Associate NDO with a group"
  tabindex="-1"
  class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
  onkeydown={handleKeydown}
>
  <div
    class="relative w-full max-w-sm rounded-xl border border-gray-200 bg-white shadow-xl"
    role="presentation"
  >
    <div class="border-b border-gray-100 px-5 py-4">
      <h2 class="text-base font-semibold text-gray-900">Associate with a group</h2>
      <p class="mt-0.5 text-sm text-gray-500">
        Add <span class="font-medium text-gray-700">"{ndoName}"</span> to one of your groups so group
        members can find and join it.
      </p>
    </div>

    <div class="max-h-72 overflow-y-auto px-5 py-3">
      {#if lobbyStore.isLoading || loadingAssociations}
        <p class="text-sm text-gray-400 italic">Loading groups…</p>
      {:else if lobbyStore.groups.length === 0}
        <p class="text-sm text-gray-400 italic">
          You have no groups yet. Create one from the sidebar.
        </p>
      {:else if availableGroups.length === 0}
        <p class="text-sm text-gray-400 italic">
          This NDO is already associated with all your groups.
        </p>
      {:else}
        <ul class="space-y-1">
          {#each availableGroups as g (g.id)}
            <li>
              <label
                class="flex cursor-pointer items-center gap-2.5 rounded px-2 py-1.5 hover:bg-gray-50"
              >
                <input
                  type="checkbox"
                  checked={selected.has(g.id)}
                  onchange={() => toggle(g.id)}
                  class="h-4 w-4 rounded border-gray-300 accent-blue-600"
                />
                <span class="text-sm text-gray-800">{g.name}</span>
              </label>
            </li>
          {/each}
        </ul>
      {/if}
    </div>

    <div class="flex justify-end gap-2 border-t border-gray-100 px-5 py-3">
      <button
        type="button"
        onclick={onclose}
        class="rounded px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-100"
      >
        Cancel
      </button>
      <button
        type="button"
        disabled={selected.size === 0 || saved}
        onclick={handleConfirm}
        class="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {saved ? 'Saved!' : `Add to ${selected.size || ''} group${selected.size !== 1 ? 's' : ''}`}
      </button>
    </div>
  </div>
</div>
