<script lang="ts">
  import { encodeHashToBase64 } from '@holochain/client';
  import type { PoolEntry } from '@nondominium/shared-types';
  import { NdoButton } from '@nondominium/ndo-ui';
  import { groupStore, type PoolCommitmentSummary } from '$lib/stores/group.store.svelte';

  let withdrawing = $state<string | null>(null);
  let errorMessage = $state<string | null>(null);
  let showWithdrawn = $state(false);
  let details = $state<Record<string, PoolCommitmentSummary | null>>({});
  let loadingDetails = $state(false);

  const admitted = $derived(groupStore.poolEntries.filter((e) => e.anchor.status === 'Admitted'));
  const withdrawn = $derived(groupStore.poolEntries.filter((e) => e.anchor.status === 'Withdrawn'));
  const visible = $derived(showWithdrawn ? groupStore.poolEntries : admitted);

  function ndoHref(entry: PoolEntry): string {
    return `/ndo/${encodeURIComponent(encodeHashToBase64(entry.anchor.identity_action_hash))}`;
  }

  function entryKey(entry: PoolEntry): string {
    return encodeHashToBase64(entry.original_action_hash);
  }

  function commitmentKey(entry: PoolEntry): string {
    return encodeHashToBase64(entry.anchor.commitment_action_hash);
  }

  async function resolveDetails(entries: PoolEntry[]) {
    const pending = entries.filter((e) => !(commitmentKey(e) in details));
    if (pending.length === 0) return;
    loadingDetails = true;
    const resolved = await groupStore.resolvePoolCommitmentDetails(pending);
    details = { ...details, ...resolved };
    loadingDetails = false;
  }

  async function handleWithdraw(entry: PoolEntry) {
    const key = entryKey(entry);
    withdrawing = key;
    errorMessage = null;
    const result = await groupStore.withdrawCommitment(entry);
    withdrawing = null;
    if (!result.ok) errorMessage = result.cause;
  }

  $effect(() => {
    const rows = visible;
    if (rows.length > 0) void resolveDetails(rows);
  });
</script>

<section class="mt-6 rounded-lg border border-gray-200 bg-white p-5" data-testid="pool-section">
  <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
    <div>
      <h2 class="text-base font-semibold text-gray-900">Commitment pool</h2>
      <p class="mt-1 text-xs text-gray-500">
        This group is a pool: members admit commitments from any NDO. Withdrawal marks status; the
        record stays for audit.
      </p>
    </div>
    <label class="flex items-center gap-2 text-xs text-gray-600">
      <input type="checkbox" bind:checked={showWithdrawn} class="rounded border-gray-300" />
      Show withdrawn
    </label>
  </div>

  {#if errorMessage}
    <p class="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
      {errorMessage}
    </p>
  {/if}

  {#if groupStore.poolEntries.length === 0}
    <p class="text-sm text-gray-500" data-testid="pool-empty">
      No commitments in this pool yet. From an NDO’s Activity tab, use Admit to pool.
    </p>
  {:else if visible.length === 0}
    <p class="text-sm text-gray-500">No admitted commitments. Toggle “Show withdrawn” to see history.</p>
  {:else}
    {#if loadingDetails}
      <p class="mb-2 text-xs text-gray-400">Resolving commitment details…</p>
    {/if}
    <ul class="divide-y divide-gray-100" data-testid="pool-list">
      {#each visible as entry (entryKey(entry))}
        {@const ck = commitmentKey(entry)}
        {@const summary = details[ck]}
        <li class="flex flex-wrap items-start justify-between gap-3 py-3">
          <div class="min-w-0 flex-1">
            <a
              href={ndoHref(entry)}
              class="text-sm font-medium text-blue-700 hover:underline"
              data-testid="pool-ndo-link"
            >
              NDO {encodeHashToBase64(entry.anchor.identity_action_hash).slice(0, 12)}…
            </a>
            <p class="mt-0.5 font-mono text-xs text-gray-500 break-all">
              Commitment {ck.slice(0, 16)}…
            </p>
            {#if summary}
              <p class="mt-1 text-xs text-gray-700">
                <span class="font-medium">{summary.action}</span>
                {#if summary.quantity}
                  · {summary.quantity}
                {/if}
                {#if summary.due}
                  · due {summary.due}
                {/if}
              </p>
            {:else if summary === null}
              <p class="mt-1 text-xs text-amber-700">Details unavailable (NDO cell not joined yet).</p>
            {/if}
            <p class="mt-1 text-xs text-gray-400">
              Status: {entry.anchor.status}
              {#if entry.anchor.status === 'Withdrawn' && entry.anchor.status_changed_at}
                · {new Date(Number(entry.anchor.status_changed_at) / 1000).toLocaleString()}
              {/if}
            </p>
          </div>
          {#if entry.anchor.status === 'Admitted'}
            <NdoButton
              variant="ghost"
              class="!px-3 !py-1.5 !text-xs"
              disabled={withdrawing === entryKey(entry)}
              onclick={() => void handleWithdraw(entry)}
            >
              {withdrawing === entryKey(entry) ? 'Withdrawing…' : 'Withdraw'}
            </NdoButton>
          {/if}
        </li>
      {/each}
    </ul>
  {/if}
</section>
