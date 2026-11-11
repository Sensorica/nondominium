<script lang="ts">
  import type { CellId } from '@holochain/client';
  import { encodeHashToBase64 } from '@holochain/client';
  import type {
    CommitmentRecord,
    FulfillmentPerformanceMetrics,
    OperationalState
  } from '@nondominium/shared-types';
  import {
    ALREADY_FULFILLED_HINT,
    Modal,
    NdoButton,
    OWN_COMMITMENT_FULFILL_HINT,
    canInitiateCommitmentFulfillment,
    fulfillCommitmentErrorMessage
  } from '@nondominium/ndo-ui';
  import { appContext } from '$lib/stores/app.context.svelte';
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

  const myAgentB64 = $derived(
    appContext.myAgentPubKey ? encodeHashToBase64(appContext.myAgentPubKey) : null
  );

  const alreadyFulfilled = $derived(record.fulfilled === true);

  const iAmAuthor = $derived(
    !canInitiateCommitmentFulfillment({
      myAgentB64,
      authorB64: record.author ? encodeHashToBase64(record.author) : null,
      fulfilled: false
    })
  );

  const canSubmit = $derived(
    canInitiateCommitmentFulfillment({
      myAgentB64,
      authorB64: record.author ? encodeHashToBase64(record.author) : null,
      fulfilled: record.fulfilled
    })
  );

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
    if (alreadyFulfilled) {
      errorMessage = ALREADY_FULFILLED_HINT;
      return;
    }
    if (iAmAuthor) {
      errorMessage = OWN_COMMITMENT_FULFILL_HINT;
      return;
    }
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
      errorMessage = fulfillCommitmentErrorMessage(governanceStore.errorMessage);
    }
  }
</script>

<Modal
  title="Fulfill commitment"
  subtitle="Writes the event, the claim, and both bilateral PPRs in one call. The counterparty must be reachable to countersign."
  maxWidth="lg"
>
  {#snippet children()}
    <div class="space-y-4">
      <p class="text-sm text-gray-700">
        Action <span class="font-medium">{record.commitment.action}</span>
      </p>
      {#if alreadyFulfilled}
        <p class="rounded border border-emerald-200 bg-emerald-50 p-2 text-sm text-emerald-900">
          {ALREADY_FULFILLED_HINT}
        </p>
      {:else if iAmAuthor}
        <p class="rounded border border-amber-200 bg-amber-50 p-2 text-sm text-amber-900">
          {OWN_COMMITMENT_FULFILL_HINT}
        </p>
      {/if}
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="mb-1 block text-sm font-medium text-gray-700" for="f-qty"
            >Observed quantity</label
          >
          <input
            id="f-qty"
            type="number"
            bind:value={quantity}
            disabled={iAmAuthor}
            class="w-full rounded border border-gray-300 px-3 py-2 text-sm disabled:opacity-50"
          />
        </div>
        <div>
          <label class="mb-1 block text-sm font-medium text-gray-700" for="f-unit">Unit</label>
          <input
            id="f-unit"
            type="text"
            bind:value={unit}
            disabled={iAmAuthor}
            class="w-full rounded border border-gray-300 px-3 py-2 text-sm disabled:opacity-50"
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
          disabled={iAmAuthor}
          class="w-full rounded border border-gray-300 px-3 py-2 text-sm disabled:opacity-50"
        >
          <option value="">Leave unchanged</option>
          {#each states as s}
            <option value={s}>{s}</option>
          {/each}
        </select>
      </div>
      <fieldset class="grid grid-cols-2 gap-3" disabled={iAmAuthor}>
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
          disabled={iAmAuthor}
          class="w-full rounded border border-gray-200 px-3 py-2 text-sm disabled:opacity-50"
        ></textarea>
      </div>
      {#if errorMessage}
        <p class="rounded border border-red-200 bg-red-50 p-2 text-sm text-red-700">{errorMessage}</p>
      {/if}
    </div>
  {/snippet}
  {#snippet footer()}
    <NdoButton variant="ghost" onclick={onclose}>Cancel</NdoButton>
    <NdoButton disabled={isSubmitting || !canSubmit} onclick={() => void handleSubmit()}>
      {isSubmitting ? 'Fulfilling…' : 'Fulfill'}
    </NdoButton>
  {/snippet}
</Modal>
