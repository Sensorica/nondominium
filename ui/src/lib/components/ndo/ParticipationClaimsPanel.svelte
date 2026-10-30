<script lang="ts">
  import type { CellId } from '@holochain/client';
  import { encodeHashToBase64 } from '@holochain/client';
  import {
    governanceStore,
    type GetMyParticipationClaimsResult
  } from '$lib/stores/governance.store.svelte';

  interface Props {
    ndoCellId?: CellId | null;
  }

  let { ndoCellId = null }: Props = $props();

  let result = $state<GetMyParticipationClaimsResult | null>(null);
  let loadError = $state<string | null>(null);
  let loading = $state(false);

  async function load() {
    loading = true;
    loadError = null;
    const out = await governanceStore.fetchMyParticipationClaims(undefined, ndoCellId ?? undefined);
    loading = false;
    if (out) {
      result = out;
    } else {
      loadError = governanceStore.errorMessage ?? 'Could not load private participation claims.';
      result = null;
    }
  }

  $effect(() => {
    void ndoCellId;
    void load();
  });
</script>

<section>
  <div class="mb-2 flex items-center justify-between">
    <h4 class="text-sm font-semibold text-gray-800">My participation claims</h4>
    <button
      type="button"
      onclick={() => void load()}
      class="text-xs text-gray-500 underline hover:text-gray-800"
    >
      Refresh
    </button>
  </div>
  <p class="mb-2 text-xs text-gray-500">
    Private entries on this agent's source chain. Only you can read them.
  </p>
  {#if loading && !result}
    <p class="text-sm text-gray-500">Loading…</p>
  {:else if loadError}
    <p class="text-sm text-red-600">{loadError}</p>
  {:else if !result || result.claims.length === 0}
    <p class="text-sm text-gray-500">No participation claims yet.</p>
  {:else}
    <p class="mb-2 text-xs text-gray-400">{result.totalCount} total</p>
    <ul class="space-y-2">
      {#each result.claims as row (encodeHashToBase64(row.hash))}
        <li class="rounded border border-gray-200 bg-white p-3 text-sm">
          <div class="font-medium text-gray-900">{row.claim.claim_type}</div>
          <div class="mt-1 text-xs text-gray-600">
            Counterparty {encodeHashToBase64(row.claim.counterparty).slice(0, 10)}… ·
            {new Date(Number(row.claim.claimed_at) / 1000).toLocaleString()}
          </div>
          <div class="mt-1 text-xs text-gray-500">
            T {row.claim.performance_metrics.timeliness.toFixed(2)} · Q
            {row.claim.performance_metrics.quality.toFixed(2)} · R
            {row.claim.performance_metrics.reliability.toFixed(2)} · C
            {row.claim.performance_metrics.communication.toFixed(2)}
          </div>
        </li>
      {/each}
    </ul>
  {/if}
</section>
