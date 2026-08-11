<script lang="ts">
  import type { ActionHash, AgentPubKey } from '@holochain/client';
  import { decodeHashFromBase64, encodeHashToBase64 } from '@holochain/client';
  import type {
    ConstraintViolation,
    PropertyRegime,
    ResourceNature,
    Rivalry,
    VfAction
  } from '@nondominium/shared-types';
  import { governanceStore } from '$lib/stores/governance.store.svelte';
  import holochainClientService from '$lib/services/holochain.service.svelte';

  interface Props {
    ndoActionHash: ActionHash;
    propertyRegime: PropertyRegime;
    resourceNature: ResourceNature;
    rivalryOverride?: Rivalry;
    onclose: () => void;
    oncreated?: () => void;
  }

  let {
    ndoActionHash,
    propertyRegime,
    resourceNature,
    rivalryOverride,
    onclose,
    oncreated
  }: Props = $props();

  const actions: VfAction[] = [
    'Transfer',
    'Move',
    'Use',
    'Consume',
    'Produce',
    'Work',
    'Modify',
    'Combine',
    'Separate',
    'Raise',
    'Lower',
    'Cite',
    'Accept',
    'InitialTransfer',
    'AccessForUse',
    'TransferCustody'
  ];

  let action = $state<VfAction>('Use');
  let providerB64 = $state('');
  let dueDateLocal = $state('');
  let note = $state('');
  let isSubmitting = $state(false);
  let errorMessage = $state('');
  let violations = $state<ConstraintViolation[]>([]);
  let dryRunPending = $state(false);

  const hardViolations = $derived(violations.filter((v) => v.severity === 'Hard'));
  const softViolations = $derived(violations.filter((v) => v.severity === 'Soft'));

  async function ensureProvider() {
    if (!providerB64) {
      try {
        const me = await holochainClientService.getMyAgentPubKey();
        providerB64 = encodeHashToBase64(me);
      } catch {
        /* leave empty */
      }
    }
  }

  $effect(() => {
    void ensureProvider();
  });

  async function runDryRun() {
    dryRunPending = true;
    violations = await governanceStore.checkActionConstraints({
      property_regime: propertyRegime,
      resource_nature: resourceNature,
      ...(rivalryOverride && { rivalry_override: rivalryOverride }),
      action
    });
    dryRunPending = false;
  }

  $effect(() => {
    void action;
    void runDryRun();
  });

  async function handleSubmit() {
    await runDryRun();
    if (hardViolations.length > 0) {
      errorMessage = 'Resolve Hard action constraints before submitting.';
      return;
    }
    if (!providerB64 || !dueDateLocal) {
      errorMessage = 'Provider and due date are required.';
      return;
    }
    let provider: AgentPubKey;
    try {
      provider = decodeHashFromBase64(providerB64) as AgentPubKey;
    } catch {
      errorMessage = 'Invalid provider pubkey (base64).';
      return;
    }
    isSubmitting = true;
    errorMessage = '';
    const dueMs = new Date(dueDateLocal).getTime();
    const out = await governanceStore.proposeCommitment({
      action,
      provider,
      due_date: dueMs * 1000,
      note: note.trim() || null,
      ndo_identity_hash: ndoActionHash
    });
    isSubmitting = false;
    if (out) {
      oncreated?.();
      onclose();
    } else {
      errorMessage = governanceStore.errorMessage ?? 'Failed to propose commitment.';
    }
  }
</script>

<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
  <div
    class="relative w-full max-w-lg rounded-xl border border-gray-200 bg-white shadow-xl"
    role="dialog"
    aria-modal="true"
    aria-labelledby="commitment-create-title"
  >
    <div class="border-b border-gray-100 px-6 py-4">
      <h2 id="commitment-create-title" class="text-lg font-semibold text-gray-900">
        Propose commitment
      </h2>
      <p class="mt-1 text-sm text-gray-500">
        Dry-runs <code class="text-xs">check_action_constraints</code> before write.
      </p>
    </div>

    <div class="max-h-[70vh] space-y-4 overflow-y-auto px-6 py-4">
      <div>
        <label class="mb-1 block text-sm font-medium text-gray-700" for="c-action">Action</label>
        <select
          id="c-action"
          bind:value={action}
          class="w-full rounded border border-gray-300 px-3 py-2 text-sm"
        >
          {#each actions as a}
            <option value={a}>{a}</option>
          {/each}
        </select>
      </div>
      <div>
        <label class="mb-1 block text-sm font-medium text-gray-700" for="c-provider"
          >Provider (agent pubkey b64)</label
        >
        <input
          id="c-provider"
          type="text"
          bind:value={providerB64}
          class="w-full rounded border border-gray-300 px-3 py-2 font-mono text-xs"
        />
      </div>
      <div>
        <label class="mb-1 block text-sm font-medium text-gray-700" for="c-due">Due date</label>
        <input
          id="c-due"
          type="datetime-local"
          bind:value={dueDateLocal}
          class="w-full rounded border border-gray-300 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label class="mb-1 block text-sm text-gray-600" for="c-note">Note</label>
        <textarea
          id="c-note"
          rows="2"
          bind:value={note}
          class="w-full rounded border border-gray-200 px-3 py-2 text-sm"
        ></textarea>
      </div>

      {#if hardViolations.length > 0}
        <ul class="space-y-1 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {#each hardViolations as v (v.rule_id + v.message)}
            <li><span class="font-medium">[{v.rule_id}]</span> {v.message}</li>
          {/each}
        </ul>
      {/if}
      {#if softViolations.length > 0}
        <ul class="space-y-1 rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          {#each softViolations as v (v.rule_id + v.message)}
            <li><span class="font-medium">[{v.rule_id}]</span> {v.message}</li>
          {/each}
        </ul>
      {/if}
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
        disabled={isSubmitting || dryRunPending || hardViolations.length > 0}
        onclick={handleSubmit}
        class="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {isSubmitting ? 'Submitting…' : 'Propose'}
      </button>
    </div>
  </div>
</div>
