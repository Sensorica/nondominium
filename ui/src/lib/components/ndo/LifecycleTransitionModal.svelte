<script lang="ts">
  import { Effect as E, Exit, pipe } from 'effect';
  import type { LifecycleStage, NdoDescriptor } from '@nondominium/shared-types';
  import { decodeHashFromBase64 } from '@holochain/client';
  import type { ActionHash } from '@holochain/client';
  import { NdoServiceTag, NdoServiceResolved } from '$lib/services/zomes/ndo.service';
  import { lobbyStore } from '$lib/stores/lobby.store.svelte';

  interface Props {
    descriptor: NdoDescriptor;
    onclose: () => void;
    onadvanced: () => void;
  }

  let { descriptor, onclose, onadvanced }: Props = $props();

  const transitions: Record<string, LifecycleStage[]> = {
    Ideation: ['Specification', 'Deprecated', 'EndOfLife'],
    Specification: ['Development', 'Deprecated', 'EndOfLife'],
    Development: ['Prototype', 'Deprecated', 'EndOfLife'],
    Prototype: ['Stable', 'Deprecated', 'EndOfLife'],
    Stable: ['Distributed', 'Deprecated', 'EndOfLife'],
    Distributed: ['Active', 'Deprecated', 'EndOfLife'],
    Active: ['Hibernating', 'Deprecated', 'EndOfLife'],
    Hibernating: ['Deprecated', 'EndOfLife'],
    Deprecated: ['EndOfLife']
  };

  const currentStage = descriptor.lifecycle_stage ?? '';
  const allowed: LifecycleStage[] = (transitions[currentStage] ?? []);

  // Add "return from hibernation" if Hibernating
  const allOptions: LifecycleStage[] = descriptor.lifecycle_stage === 'Hibernating' && descriptor.hibernation_origin
    ? ([descriptor.hibernation_origin as LifecycleStage, ...allowed] as LifecycleStage[])
    : allowed;

  let selectedStage = $state<LifecycleStage | ''>('');
  let successorSearch = $state('');
  let selectedSuccessorHash = $state('');
  let isSubmitting = $state(false);
  let errorMessage = $state('');

  const needsSuccessor = $derived(selectedStage === 'Deprecated');
  const needsConfirm = $derived(selectedStage === 'Hibernating');

  const matchingNdos = $derived(
    successorSearch.trim().length >= 2
      ? lobbyStore.ndos.filter(
          (n) =>
            n.name.toLowerCase().includes(successorSearch.toLowerCase()) &&
            n.hash !== descriptor.hash
        )
      : []
  );

  async function handleConfirm() {
    if (!selectedStage) {
      errorMessage = 'Please select a target stage.';
      return;
    }
    if (needsSuccessor && !selectedSuccessorHash) {
      errorMessage = 'Please select a successor NDO for deprecation.';
      return;
    }
    isSubmitting = true;
    errorMessage = '';

    const originalHash = decodeHashFromBase64(descriptor.hash) as ActionHash;
    const successorHash = selectedSuccessorHash
      ? (decodeHashFromBase64(selectedSuccessorHash) as ActionHash)
      : undefined;

    const exit = await E.runPromiseExit(
      pipe(
        E.gen(function* () {
          const svc = yield* NdoServiceTag;
          return yield* svc.updateLifecycleStage({
            original_action_hash: originalHash,
            new_stage: selectedStage as LifecycleStage,
            successor_ndo_hash: successorHash,
            transition_event_hash: undefined
          });
        }),
        E.provide(NdoServiceResolved)
      )
    );

    isSubmitting = false;
    if (Exit.isSuccess(exit)) {
      onadvanced();
      onclose();
    } else {
      errorMessage = `Failed to advance stage: ${String(exit.cause)}`;
    }
  }
</script>

<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
  <div
    class="relative w-full max-w-sm rounded-xl border border-gray-200 bg-white shadow-xl"
    role="dialog"
    aria-modal="true"
    aria-labelledby="lifecycle-modal-title"
  >
    <div class="border-b border-gray-100 px-6 py-4">
      <h2 id="lifecycle-modal-title" class="text-lg font-semibold text-gray-900">
        Advance lifecycle stage
      </h2>
      <p class="mt-1 text-sm text-gray-500">
        Current stage: <span class="font-medium text-gray-800">{currentStage}</span>
      </p>
    </div>

    <div class="px-6 py-4 space-y-3">
      {#if allOptions.length === 0}
        <p class="text-sm text-gray-500">No further transitions available from <strong>{currentStage}</strong>.</p>
      {:else}
        <fieldset>
          <legend class="mb-2 text-sm font-medium text-gray-700">Target stage:</legend>
          <div class="space-y-2">
            {#each allOptions as stage}
              <label class="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="target-stage"
                  value={stage}
                  bind:group={selectedStage}
                  class="h-4 w-4"
                />
                <span class="text-sm text-gray-700">{stage}</span>
              </label>
            {/each}
          </div>
        </fieldset>

        {#if needsSuccessor}
          <div class="rounded border border-orange-200 bg-orange-50 p-3">
            <p class="mb-2 text-xs font-medium text-orange-700">Select successor NDO:</p>
            <input
              type="text"
              bind:value={successorSearch}
              placeholder="Search by name…"
              class="w-full rounded border border-orange-200 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-orange-400"
            />
            {#if matchingNdos.length > 0}
              <ul class="mt-1 max-h-32 overflow-y-auto rounded border border-gray-200 bg-white">
                {#each matchingNdos as n}
                  <li>
                    <button
                      type="button"
                      onclick={() => { selectedSuccessorHash = n.hash; successorSearch = n.name; }}
                      class="w-full px-3 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-50"
                    >
                      {n.name}
                    </button>
                  </li>
                {/each}
              </ul>
            {/if}
            {#if selectedSuccessorHash}
              <p class="mt-1 text-xs text-green-600">Selected: {successorSearch}</p>
            {/if}
          </div>
        {/if}

        {#if needsConfirm}
          <div class="rounded border border-yellow-200 bg-yellow-50 p-3 text-xs text-yellow-700">
            Hibernating preserves the current stage as origin. The NDO can resume from <strong>{currentStage}</strong> later.
          </div>
        {/if}
      {/if}

      {#if errorMessage}
        <p class="rounded border border-red-200 bg-red-50 p-2 text-sm text-red-700">{errorMessage}</p>
      {/if}
    </div>

    <div class="flex justify-end gap-2 border-t border-gray-100 px-6 py-4">
      <button
        type="button"
        onclick={onclose}
        class="rounded px-4 py-2 text-sm text-gray-600 hover:bg-gray-100"
      >
        Cancel
      </button>
      {#if allOptions.length > 0}
        <button
          type="button"
          disabled={isSubmitting || !selectedStage}
          onclick={handleConfirm}
          class="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {isSubmitting ? 'Advancing…' : 'Confirm'}
        </button>
      {/if}
    </div>
  </div>
</div>
