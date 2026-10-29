<script lang="ts">
  import { encodeHashToBase64 } from '@holochain/client';
  import type { PoolEntry } from '@nondominium/shared-types';
  import { groupStore } from '$lib/stores/group.store.svelte';

  let withdrawing = $state<string | null>(null);
  let errorMessage = $state<string | null>(null);
  let showWithdrawn = $state(false);

  const admitted = $derived(groupStore.poolEntries.filter((e) => e.anchor.status === 'Admitted'));
  const withdrawn = $derived(groupStore.poolEntries.filter((e) => e.anchor.status === 'Withdrawn'));
  const visible = $derived(showWithdrawn ? groupStore.poolEntries : admitted);

  function ndoHref(entry: PoolEntry): string {
    return `/ndo/${encodeURIComponent(encodeHashToBase64(entry.anchor.identity_action_hash))}`;
  }

  async function handleWithdraw(entry: PoolEntry) {
    const key = encodeHashToBase64(entry.original_action_hash);
    withdrawing = key;
    errorMessage = null;
    const result = await groupStore.withdrawCommitment(entry);
    withdrawing = null;
    if (!result.ok) errorMessage = result.cause;
  }
</script>

<section class="mt-6 rounded-lg border border-gray-200 bg-white p-5">
  <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
    <div>
      <h2 class="text-base font-semibold text-gray-900">Commitment pool</h2>
      <p class="mt-1 text-xs text-gray-500">
        This group is a pool: members admit commitments from any NDO. Withdrawal marks status; the
        pool keeps memory of what was once admitted.
      </p>
    </div>
    <label class="flex items-center gap-2 text-xs text-gray-600">
      <input type="checkbox" bind:checked={showWithdrawn} />
      Show withdrawn ({withdrawn.length})
    </label>
  </div>

  {#if errorMessage}
    <p class="mb-3 rounded border border-red-200 bg-red-50 p-2 text-sm text-red-700">{errorMessage}</p>
  {/if}

  {#if visible.length === 0}
    <p class="text-sm text-gray-500">
      {showWithdrawn ? 'No commitments have been admitted to this pool yet.' : 'No admitted commitments.'}
    </p>
  {:else}
    <ul class="space-y-2">
      {#each visible as entry (encodeHashToBase64(entry.original_action_hash))}
        {@const key = encodeHashToBase64(entry.original_action_hash)}
        <li class="flex flex-wrap items-center justify-between gap-2 rounded border border-gray-200 p-3 text-sm">
          <div>
            <div class="font-medium text-gray-900">
              {entry.anchor.status}
              <span class="ml-2 font-mono text-xs text-gray-500">
                {encodeHashToBase64(entry.anchor.commitment_action_hash).slice(0, 12)}…
              </span>
            </div>
            <div class="mt-1 text-xs text-gray-500">
              NDO
              <a href={ndoHref(entry)} class="text-blue-600 hover:underline">
                {encodeHashToBase64(entry.anchor.identity_action_hash).slice(0, 10)}…
              </a>
              · {new Date(Number(entry.anchor.status_changed_at) / 1000).toLocaleString()}
            </div>
          </div>
          {#if entry.anchor.status === 'Admitted'}
            <button
              type="button"
              disabled={withdrawing === key}
              onclick={() => void handleWithdraw(entry)}
              class="rounded border border-gray-300 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              {withdrawing === key ? 'Withdrawing…' : 'Withdraw'}
            </button>
          {/if}
        </li>
      {/each}
    </ul>
  {/if}
</section>
