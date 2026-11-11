<script lang="ts">
  import type { ActionHash, AgentPubKey, CellId } from '@holochain/client';
  import { decodeHashFromBase64, encodeHashToBase64 } from '@holochain/client';
  import type {
    ConstraintViolation,
    EconomicMode,
    PropertyRegime,
    ResourceNature,
    Rivalry,
    VfAction
  } from '@nondominium/shared-types';
  import { governanceStore } from '$lib/stores/governance.store.svelte';
  import { connectionStore } from '$lib/stores/connection.store.svelte';
  import { getNdoStore, isTaskInterrupted } from '$lib/stores/ndo.store.svelte';
  import AgentPubkeyField from '$lib/components/agent/AgentPubkeyField.svelte';
  import type { AgentMemberOption } from '$lib/utils/agent-pubkey';
  import { happNdoUiProfile } from '$lib/utils/ndo-ui-profile';

  interface Props {
    ndoActionHash: ActionHash;
    /** The NDO's own clone cell; null for legacy NDOs in the shared cell. */
    ndoCellId?: CellId | null;
    propertyRegime: PropertyRegime;
    resourceNature: ResourceNature;
    rivalryOverride?: Rivalry;
    /** When set, seed resource_hash from the dual-created EconomicResource. */
    economicMode?: EconomicMode | null;
    /** Group + NDO members for the provider/receiver picker. */
    members?: AgentMemberOption[];
    onclose: () => void;
    oncreated?: () => void;
  }

  let {
    ndoActionHash,
    ndoCellId = null,
    propertyRegime,
    resourceNature,
    rivalryOverride,
    economicMode = null,
    members = [],
    onclose,
    oncreated
  }: Props = $props();

  const inventoriableFork = $derived(!!economicMode);
  const ndo = getNdoStore();

  let resourceHashB64 = $state('');

  const palette = $derived(
    happNdoUiProfile({
      resourceNature,
      propertyRegime,
      economicMode,
      hasInventoriableResource: inventoriableFork || !!resourceHashB64
    }).actionPalette
  );

  let action = $state<VfAction>(
    happNdoUiProfile({
      resourceNature,
      propertyRegime,
      economicMode,
      hasInventoriableResource: !!economicMode
    }).activity.defaultAction as VfAction
  );
  let providerB64 = $state('');
  // Explicit receiver (was previously hardcoded on the backend to the caller;
  // the zome now requires an explicit field). Defaults to self for the common
  // "I propose this to myself" flow.
  let receiverB64 = $state('');
  let dueDateLocal = $state('');
  let note = $state('');
  // Optional ValueFlows Measures. Empty = omit from the commitment.
  // Bound to type="number" inputs, so Svelte gives a number, or undefined when empty.
  let resourceQuantity = $state<number | undefined>(undefined);
  let resourceUnit = $state('each');
  let effortQuantity = $state<number | undefined>(undefined);
  let effortUnit = $state('hour');
  let isSubmitting = $state(false);
  let errorMessage = $state('');
  let violations = $state<ConstraintViolation[]>([]);
  let dryRunPending = $state(false);

  const hardViolations = $derived(violations.filter((v) => v.severity === 'Hard'));
  const softViolations = $derived(violations.filter((v) => v.severity === 'Soft'));

  async function ensureProvider() {
    try {
      const me = await connectionStore.getMyAgentPubKey();
      const b64 = encodeHashToBase64(me);
      if (!providerB64) providerB64 = b64;
      if (!receiverB64) receiverB64 = b64;
    } catch {
      /* leave empty */
    }
  }

  $effect(() => {
    void ensureProvider();
  });

  $effect(() => {
    if (!inventoriableFork) return;
    const cell = ndoCellId;
    let cancelled = false;
    void (async () => {
      let rows;
      try {
        rows = await ndo().specificationsWithInstances();
      } catch (error) {
        if (cancelled || isTaskInterrupted(error)) return;
        return;
      }
      if (cancelled) return;
      if (cell == null && ndo().cellId != null) return;
      const flat = rows.flatMap((row) => row.instances);
      if (flat.length === 1) {
        resourceHashB64 = encodeHashToBase64(flat[0].actionHash);
        resourceUnit = flat[0].resource.quantity.has_unit || resourceUnit;
      }
    })();
    return () => {
      cancelled = true;
    };
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
    if (!providerB64 || !receiverB64 || !dueDateLocal) {
      errorMessage = 'Provider, receiver, and due date are required.';
      return;
    }
    let provider: AgentPubKey;
    let receiver: AgentPubKey;
    try {
      provider = decodeHashFromBase64(providerB64) as AgentPubKey;
      receiver = decodeHashFromBase64(receiverB64) as AgentPubKey;
    } catch {
      errorMessage = 'Invalid base64 pubkey for provider or receiver.';
      return;
    }
    isSubmitting = true;
    errorMessage = '';
    const dueMs = new Date(dueDateLocal).getTime();
    const resQty =
      resourceQuantity != null && Number.isFinite(resourceQuantity)
      ? {
          numerical_value: Number(resourceQuantity),
          has_unit: resourceUnit.trim() || 'each'
        }
      : null;
    const effQty =
      effortQuantity != null && Number.isFinite(effortQuantity)
      ? {
          numerical_value: Number(effortQuantity),
          has_unit: effortUnit.trim() || 'hour'
        }
      : null;
    let resourceHash: ActionHash | null = null;
    if (resourceHashB64) {
      try {
        resourceHash = decodeHashFromBase64(resourceHashB64) as ActionHash;
      } catch {
        errorMessage = 'Invalid economic resource action hash.';
        return;
      }
    }
    const out = await governanceStore.proposeCommitment(
      {
        action,
        provider,
        receiver,
        ...(resourceHash ? { resource_hash: resourceHash } : {}),
        resource_quantity: resQty,
        effort_quantity: effQty,
        due_date: dueMs * 1000,
        note: note.trim() || null,
        ndo_identity_hash: ndoActionHash
      },
      ndoCellId ?? undefined
    );
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
          <optgroup label="Suggested for this NDO">
            {#each palette.primary as a}
              <option value={a}>{a}</option>
            {/each}
          </optgroup>
          {#if palette.more.length > 0}
            <optgroup label="More">
              {#each palette.more as a}
                <option value={a}>{a}</option>
              {/each}
            </optgroup>
          {/if}
        </select>
        <p class="mt-1 text-xs text-gray-500">
          Suggested actions match this NDO’s nature
          {#if economicMode}
            and inventoriable mode ({economicMode})
          {/if}. Hard-illegal or irrelevant actions are hidden.
        </p>
      </div>
      <AgentPubkeyField
        id="c-provider"
        label="Provider"
        bind:value={providerB64}
        {members}
        hint="Pick a member or paste a full agent pubkey."
      />
      <AgentPubkeyField
        id="c-receiver"
        label="Receiver"
        bind:value={receiverB64}
        {members}
        hint="Who receives this commitment (often the other party)."
      />
      <div>
        <label class="mb-1 block text-sm font-medium text-gray-700" for="c-due">Due date</label>
        <input
          id="c-due"
          type="datetime-local"
          bind:value={dueDateLocal}
          class="w-full rounded border border-gray-300 px-3 py-2 text-sm"
        />
      </div>
      {#if inventoriableFork && resourceHashB64}
        <div>
          <label class="mb-1 block text-sm font-medium text-gray-700" for="c-res"
            >Economic resource</label
          >
          <input
            id="c-res"
            type="text"
            value={resourceHashB64}
            readonly
            class="w-full rounded border border-gray-200 bg-gray-50 px-3 py-2 font-mono text-xs text-gray-700"
          />
          <p class="mt-1 text-xs text-gray-500">
            Seeded with this {economicMode === 'Consume' ? 'batch' : 'held thing'}.
          </p>
        </div>
      {/if}
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="mb-1 block text-sm text-gray-600" for="c-res-qty">Resource quantity (optional)</label>
          <input
            id="c-res-qty"
            type="number"
            bind:value={resourceQuantity}
            class="w-full rounded border border-gray-300 px-3 py-2 text-sm"
            placeholder="e.g. 1"
          />
        </div>
        <div>
          <label class="mb-1 block text-sm text-gray-600" for="c-res-unit">Resource unit</label>
          <input
            id="c-res-unit"
            type="text"
            bind:value={resourceUnit}
            class="w-full rounded border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="mb-1 block text-sm text-gray-600" for="c-eff-qty">Effort quantity (optional)</label>
          <input
            id="c-eff-qty"
            type="number"
            bind:value={effortQuantity}
            class="w-full rounded border border-gray-300 px-3 py-2 text-sm"
            placeholder="e.g. 4"
          />
        </div>
        <div>
          <label class="mb-1 block text-sm text-gray-600" for="c-eff-unit">Effort unit</label>
          <input
            id="c-eff-unit"
            type="text"
            bind:value={effortUnit}
            class="w-full rounded border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
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
