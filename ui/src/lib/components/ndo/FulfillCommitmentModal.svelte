<script lang="ts">
  import type { CellId } from '@holochain/client';
  import type {
    CommitmentRecord,
    FulfillmentPerformanceMetrics,
    OperationalState
  } from '@nondominium/shared-types';
  import { governanceStore } from '$lib/stores/governance.store.svelte';

  interface Props {
    record: CommitmentRecord;
    ndoCellId?: CellId | null;
    onclose: () => void;
    onfulfilled?: () => void;
  }

  let { record, ndoCellId = null, onclose, onfulfilled }: Props = $props();

  const defaultMetrics = (): FulfillmentPerformanceMetrics => ({
    timeliness: 0.8,
    quality: 0.8,
    reliability: 0.8,
    communication: 0.8,
    overall_satisfaction: 0.8
  });

  const committedQty = record.commitment.resource_quantity;
  let quantity = $state(committedQty?.numerical_value?.toString() ?? '1');
  let unit = $state(committedQty?.has_unit ?? 'each');
  let resourceState = $state<OperationalState | ''>('');
  let note = $state('');
  let metrics = $state<FulfillmentPerformanceMetrics>(defaultMetrics());
  let isSubmitting = $state(false);
  let errorMessage = $state('');

  const states: OperationalState[] = [
    'Available',
    'Reserved',
    'InTransit',
    'InStorage',
    'InMaintenance',
    'InUse',
    'PendingValidation'
  ];

  async function handleSubmit() {
    const numerical = Number(quantity);
    if (!Number.isFinite(numerical) || numerical < 0) {
      errorMessage = 'Observed quantity must be a non-negative number.';
      return;
    }
    isSubmitting = true;
    errorMessage = '';
    const out = await governanceStore.fulfillCommitmentClosure(
      {
        commitment_hash: record.action_hash,
        observed_quantity: { numerical_value: numerical, has_unit: unit.trim() || 'each' },
        resource_state_update: resourceState === '' ? null : resourceState,
        provider_metrics: metrics,
        receiver_metrics: metrics,
        note: note.trim() || null
      },
      ndoCellId ?? undefined
    );
    isSubmitting = false;
    if (out) {
      onfulfilled?.();
      onclose();
    } else {
      errorMessage =
        governanceStore.errorMessage ??
        'Fulfillment failed. The counterparty must be online to countersign.';
    }
  }
</script>

<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
  <div
    class="relative w-full max-w-lg rounded-xl border border-gray-200 bg-white shadow-xl"
    role="dialog"
    aria-modal="true"
    aria-labelledby="fulfill-title"
  >
    <div class="border-b border-gray-100 px-6 py-4">
      <h2 id="fulfill-title" class="text-lg font-semibold text-gray-900">Fulfill commitment</h2>
      <p class="mt-1 text-sm text-gray-500">
        Writes the event, the claim, and both bilateral PPRs in one call. The counterparty must be
        reachable to countersign.
      </p>
    </div>

    <div class="max-h-[70vh] space-y-4 overflow-y-auto px-6 py-4">
      <p class="text-sm text-gray-700">
        Action <span class="font-medium">{record.commitment.action}</span>
      </p>
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="mb-1 block text-sm font-medium text-gray-700" for="f-qty"
            >Observed quantity</label
          >
          <input
            id="f-qty"
            type="number"
            bind:value={quantity}
            class="w-full rounded border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label class="mb-1 block text-sm font-medium text-gray-700" for="f-unit">Unit</label>
          <input
            id="f-unit"
            type="text"
            bind:value={unit}
            class="w-full rounded border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
      </div>
      <div>
        <label class="mb-1 block text-sm font-medium text-gray-700" for="f-state"
          >Resource state after (optional)</label
        >
        <select
          id="f-state"
          bind:value={resourceState}
          class="w-full rounded border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">Leave unchanged</option>
          {#each states as s}
            <option value={s}>{s}</option>
          {/each}
        </select>
      </div>
      <fieldset class="grid grid-cols-2 gap-3">
        <legend class="mb-1 text-sm font-medium text-gray-700">Performance (0–1, both sides)</legend>
        {#each ['timeliness', 'quality', 'reliability', 'communication', 'overall_satisfaction'] as key}
          <div>
            <label class="mb-1 block text-xs text-gray-600" for="f-{key}">{key.replaceAll('_', ' ')}</label>
            <input
              id="f-{key}"
              type="number"
              min="0"
              max="1"
              step="0.05"
              value={metrics[key as keyof FulfillmentPerformanceMetrics]}
              oninput={(e) => {
                const v = Number((e.currentTarget as HTMLInputElement).value);
                metrics = { ...metrics, [key]: Number.isFinite(v) ? v : 0 };
              }}
              class="w-full rounded border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
        {/each}
      </fieldset>
      <div>
        <label class="mb-1 block text-sm text-gray-600" for="f-note">Note</label>
        <textarea
          id="f-note"
          rows="2"
          bind:value={note}
          class="w-full rounded border border-gray-200 px-3 py-2 text-sm"
        ></textarea>
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
        disabled={isSubmitting}
        onclick={handleSubmit}
        class="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {isSubmitting ? 'Fulfilling…' : 'Fulfill'}
      </button>
    </div>
  </div>
</div>
