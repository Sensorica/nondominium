<script lang="ts">
  import type { ActionHash, AgentPubKey, CellId } from '@holochain/client';
  import { decodeHashFromBase64, encodeHashToBase64 } from '@holochain/client';
  import type {
    ConstraintViolation,
    PropertyRegime,
    ResourceNature,
    Rivalry,
    VfAction,
    VfCommitment
  } from '@nondominium/shared-types';
  import { governanceStore } from '$lib/stores/governance.store.svelte';
  import holochainClientService from '$lib/services/holochain.service.svelte';

  interface Props {
    ndoActionHash: ActionHash;
    /** The NDO's own clone cell; null for legacy NDOs in the shared cell. */
    ndoCellId?: CellId | null;
    propertyRegime: PropertyRegime;
    resourceNature: ResourceNature;
    rivalryOverride?: Rivalry;
    pendingCommitments?: VfCommitment[];
    onclose: () => void;
    oncreated?: () => void;
  }

  let {
    ndoActionHash,
    ndoCellId = null,
    propertyRegime,
    resourceNature,
    rivalryOverride,
    pendingCommitments = [],
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
  let receiverB64 = $state('');
  let resourceHashB64 = $state('');
  let quantity = $state('1');
  let note = $state('');
  let fromCommitmentIdx = $state<number | ''>('');
  let isSubmitting = $state(false);
  let errorMessage = $state('');
  let violations = $state<ConstraintViolation[]>([]);
  let dryRunPending = $state(false);

  const hardViolations = $derived(violations.filter((v) => v.severity === 'Hard'));
  const softViolations = $derived(violations.filter((v) => v.severity === 'Soft'));

  const ndoCommitments = $derived(
    pendingCommitments.filter(
      (c) => encodeHashToBase64(c.ndo_identity_hash) === encodeHashToBase64(ndoActionHash)
    )
  );

  async function seedAgents() {
    try {
      const me = await holochainClientService.getMyAgentPubKey();
      const b64 = encodeHashToBase64(me);
      if (!providerB64) providerB64 = b64;
      if (!receiverB64) receiverB64 = b64;
    } catch {
      /* ignore */
    }
  }

  $effect(() => {
    void seedAgents();
  });

  $effect(() => {
    if (fromCommitmentIdx === '') return;
    const c = ndoCommitments[fromCommitmentIdx as number];
    if (!c) return;
    action = c.action;
    providerB64 = encodeHashToBase64(c.provider);
    receiverB64 = encodeHashToBase64(c.receiver);
    if (c.resource_inventoried_as) {
      resourceHashB64 = encodeHashToBase64(c.resource_inventoried_as);
    }
  });

  async function runDryRun() {
    dryRunPending = true;
    violations = await governanceStore.checkActionConstraints(
      {
        property_regime: propertyRegime,
        resource_nature: resourceNature,
        ...(rivalryOverride && { rivalry_override: rivalryOverride }),
        action
      },
      ndoCellId ?? undefined
    );
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
    if (!providerB64 || !receiverB64 || !resourceHashB64) {
      errorMessage = 'Provider, receiver, and resource hash are required.';
      return;
    }
    let provider: AgentPubKey;
    let receiver: AgentPubKey;
    let resource: ActionHash;
    try {
      provider = decodeHashFromBase64(providerB64) as AgentPubKey;
      receiver = decodeHashFromBase64(receiverB64) as AgentPubKey;
      resource = decodeHashFromBase64(resourceHashB64) as ActionHash;
    } catch {
      errorMessage = 'Invalid base64 hash for provider, receiver, or resource.';
      return;
    }
    isSubmitting = true;
    errorMessage = '';
    const commitment =
      fromCommitmentIdx !== '' ? ndoCommitments[fromCommitmentIdx as number] : undefined;
    const out = await governanceStore.logEconomicEvent(
      {
        action,
        provider,
        receiver,
        resource_inventoried_as: resource,
        resource_quantity: Number(quantity) || 1,
        note: note.trim() || null,
        generate_pprs: false,
        ndo_identity_hash: ndoActionHash,
        ...(commitment && {
          commitment_hash: undefined as ActionHash | undefined
        })
      },
      ndoCellId ?? undefined
    );
    isSubmitting = false;
    if (out) {
      oncreated?.();
      onclose();
    } else {
      errorMessage = governanceStore.errorMessage ?? 'Failed to log economic event.';
    }
  }
</script>

<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
  <div
    class="relative w-full max-w-lg rounded-xl border border-gray-200 bg-white shadow-xl"
    role="dialog"
    aria-modal="true"
    aria-labelledby="event-create-title"
  >
    <div class="border-b border-gray-100 px-6 py-4">
      <h2 id="event-create-title" class="text-lg font-semibold text-gray-900">Log economic event</h2>
      <p class="mt-1 text-sm text-gray-500">
        Dry-runs <code class="text-xs">check_action_constraints</code> before write.
      </p>
    </div>

    <div class="max-h-[70vh] space-y-4 overflow-y-auto px-6 py-4">
      {#if ndoCommitments.length > 0}
        <div>
          <label class="mb-1 block text-sm font-medium text-gray-700" for="from-c"
            >Create from commitment</label
          >
          <select
            id="from-c"
            bind:value={fromCommitmentIdx}
            class="w-full rounded border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">— none —</option>
            {#each ndoCommitments as c, i (i)}
              <option value={i}>{c.action} · due {new Date(Number(c.due_date) / 1000).toLocaleString()}</option>
            {/each}
          </select>
        </div>
      {/if}

      <div>
        <label class="mb-1 block text-sm font-medium text-gray-700" for="e-action">Action</label>
        <select id="e-action" bind:value={action} class="w-full rounded border border-gray-300 px-3 py-2 text-sm">
          {#each actions as a}
            <option value={a}>{a}</option>
          {/each}
        </select>
      </div>
      <div>
        <label class="mb-1 block text-sm font-medium text-gray-700" for="e-provider">Provider b64</label>
        <input id="e-provider" type="text" bind:value={providerB64} class="w-full rounded border border-gray-300 px-3 py-2 font-mono text-xs" />
      </div>
      <div>
        <label class="mb-1 block text-sm font-medium text-gray-700" for="e-receiver">Receiver b64</label>
        <input id="e-receiver" type="text" bind:value={receiverB64} class="w-full rounded border border-gray-300 px-3 py-2 font-mono text-xs" />
      </div>
      <div>
        <label class="mb-1 block text-sm font-medium text-gray-700" for="e-res"
          >Resource action hash b64</label
        >
        <input id="e-res" type="text" bind:value={resourceHashB64} class="w-full rounded border border-gray-300 px-3 py-2 font-mono text-xs" />
      </div>
      <div>
        <label class="mb-1 block text-sm font-medium text-gray-700" for="e-qty">Quantity</label>
        <input id="e-qty" type="number" bind:value={quantity} class="w-full rounded border border-gray-300 px-3 py-2 text-sm" />
      </div>
      <div>
        <label class="mb-1 block text-sm text-gray-600" for="e-note">Note</label>
        <textarea id="e-note" rows="2" bind:value={note} class="w-full rounded border border-gray-200 px-3 py-2 text-sm"></textarea>
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
        {isSubmitting ? 'Logging…' : 'Log event'}
      </button>
    </div>
  </div>
</div>
