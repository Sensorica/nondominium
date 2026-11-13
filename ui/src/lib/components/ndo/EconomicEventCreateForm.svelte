<script lang="ts">
  import type { ActionHash, AgentPubKey, CellId } from '@holochain/client';
  import { decodeHashFromBase64, encodeHashToBase64 } from '@holochain/client';
  import type {
    ConstraintViolation,
    EconomicMode,
    PropertyRegime,
    ResourceNature,
    Rivalry,
    VfAction,
    VfCommitment
  } from '@nondominium/shared-types';
  import { actionFormSpec, validateCommitmentDraft } from '@nondominium/ndo-ui';
  import { governanceStore } from '$lib/stores/governance.store.svelte';
  import { connectionStore } from '$lib/stores/connection.store.svelte';
  import { getNdoStore, isTaskInterrupted } from '$lib/stores/ndo.store.svelte';
  import AgentPubkeyField from '$lib/components/agent/AgentPubkeyField.svelte';
  import type { AgentMemberOption } from '$lib/utils/agent-pubkey';
  import { happNdoUiProfile } from '$lib/utils/ndo-ui-profile';
  import { resourceHashPrompt } from './resource-hash-field';

  interface Props {
    ndoActionHash: ActionHash;
    /** The NDO's own clone cell; null for legacy NDOs in the shared cell. */
    ndoCellId?: CellId | null;
    propertyRegime: PropertyRegime;
    resourceNature: ResourceNature;
    rivalryOverride?: Rivalry;
    /** When set, prefer the dual-created EconomicResource (no free paste). */
    economicMode?: EconomicMode | null;
    pendingCommitments?: VfCommitment[];
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
    pendingCommitments = [],
    members = [],
    onclose,
    oncreated
  }: Props = $props();

  const inventoriableFork = $derived(!!economicMode);
  const digital = $derived(String(resourceNature) === 'Digital');

  let providerB64 = $state('');
  let receiverB64 = $state('');
  let resourceHashB64 = $state('');
  /** null until the NDO's inventoried instances have been read. */
  let inventoriedCount = $state<number | null>(null);

  const profileCtx = $derived({
    resourceNature,
    propertyRegime,
    economicMode,
    hasInventoriableResource:
      inventoriableFork || (inventoriedCount != null && inventoriedCount > 0) || !!resourceHashB64
  });

  const palette = $derived(happNdoUiProfile(profileCtx).actionPalette);

  let action = $state<VfAction>(
    happNdoUiProfile({
      resourceNature,
      propertyRegime,
      economicMode,
      hasInventoriableResource: !!economicMode
    }).activity.defaultAction as VfAction
  );

  const formSpec = $derived(
    actionFormSpec(action, {
      ...profileCtx,
      surface: 'event'
    })
  );

  let resourceLookupFailed = $state(false);
  let quantity = $state<number | undefined>(1);
  let unit = $state('each');
  let note = $state('');
  let fromCommitmentIdx = $state<number | ''>('');
  let isSubmitting = $state(false);
  let errorMessage = $state('');
  let violations = $state<ConstraintViolation[]>([]);
  let dryRunPending = $state(false);

  const hardViolations = $derived(violations.filter((v) => v.severity === 'Hard'));
  const softViolations = $derived(violations.filter((v) => v.severity === 'Soft'));

  const ndo = getNdoStore();

  const hashPrompt = $derived(
    resourceHashPrompt({
      loaded: inventoriedCount !== null || digital,
      lookupFailed: resourceLookupFailed,
      instanceCount: inventoriedCount ?? 0,
      filledFromCommitment: fromCommitmentIdx !== '' && resourceHashB64 !== '',
      inventoriableFork,
      digital
    })
  );

  const ndoCommitments = $derived(
    pendingCommitments.filter(
      (c) => encodeHashToBase64(c.ndo_identity_hash) === encodeHashToBase64(ndoActionHash)
    )
  );

  const showResourceHashUi = $derived(formSpec.resourceHash.presence !== 'hidden');
  const showResourceQtyUi = $derived(formSpec.resourceQuantity.presence !== 'hidden');

  async function seedAgents() {
    try {
      const me = await connectionStore.getMyAgentPubKey();
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
    if (formSpec.agents.mode === 'unilateralSame' && providerB64) {
      receiverB64 = providerB64;
    }
  });

  $effect(() => {
    unit = formSpec.resourceQuantity.defaultUnit || unit;
  });

  $effect(() => {
    if (digital) {
      inventoriedCount = 0;
      resourceLookupFailed = false;
      return;
    }
    const cell = ndoCellId;
    let cancelled = false;
    inventoriedCount = null;
    resourceLookupFailed = false;
    void (async () => {
      let rows;
      try {
        rows = await ndo().specificationsWithInstances();
      } catch (error) {
        if (cancelled || isTaskInterrupted(error)) return;
        resourceLookupFailed = true;
        inventoriedCount = 0;
        return;
      }
      if (cancelled) return;
      if (cell == null && ndo().cellId != null) return;
      const flat = rows.flatMap((row) => row.instances);
      inventoriedCount = flat.length;
      if (flat.length === 1 && !resourceHashB64) {
        resourceHashB64 = encodeHashToBase64(flat[0].actionHash);
        unit = flat[0].resource.quantity.has_unit || unit;
      }
    })();
    return () => {
      cancelled = true;
    };
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
    if (hashPrompt.kind === 'missing' || hashPrompt.kind === 'digital') {
      errorMessage = hashPrompt.message;
      return;
    }

    const providerWire =
      formSpec.agents.mode === 'unilateralSame'
        ? providerB64 || receiverB64
        : providerB64;
    const receiverWire =
      formSpec.agents.mode === 'unilateralSame' ? providerWire : receiverB64;

    // Event time is set by the zome (sys_time); draft validator still needs a time stub.
    const draftErrors = validateCommitmentDraft(formSpec, {
      provider: providerWire,
      receiver: receiverWire,
      timeLocal: 'now',
      resourceHash: showResourceHashUi ? resourceHashB64 : null,
      resourceQuantity: showResourceQtyUi ? quantity : null,
      effortQuantity: null
    });
    if (draftErrors.length > 0) {
      errorMessage = draftErrors.join(' ');
      return;
    }

    if (showResourceHashUi && !resourceHashB64) {
      errorMessage = `${formSpec.resourceHash.label} is required.`;
      return;
    }

    let provider: AgentPubKey;
    let receiver: AgentPubKey;
    let resource: ActionHash;
    try {
      provider = decodeHashFromBase64(providerWire) as AgentPubKey;
      receiver = decodeHashFromBase64(receiverWire) as AgentPubKey;
      resource = decodeHashFromBase64(resourceHashB64) as ActionHash;
    } catch {
      errorMessage = 'Invalid base64 hash for provider, receiver, or resource.';
      return;
    }
    isSubmitting = true;
    errorMessage = '';
    const out = await governanceStore.logEconomicEvent(
      {
        action,
        provider,
        receiver,
        resource_inventoried_as: resource,
        resource_quantity: {
          numerical_value:
            quantity == null || !Number.isFinite(Number(quantity)) ? 1 : Number(quantity),
          has_unit: unit.trim() || formSpec.resourceQuantity.defaultUnit
        },
        note: note.trim() || null,
        generate_pprs: false,
        ndo_identity_hash: ndoActionHash
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
        Dry-runs <code class="text-xs">check_action_constraints</code> before write. Observation time
        is recorded by the conductor.
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
              <option value={i}
                >{c.action} · due {new Date(Number(c.due_date) / 1000).toLocaleString()}</option
              >
            {/each}
          </select>
        </div>
      {/if}

      <div>
        <label class="mb-1 block text-sm font-medium text-gray-700" for="e-action">Action</label>
        <select
          id="e-action"
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
          {#if formSpec.summaryHint}
            {formSpec.summaryHint}
          {:else}
            Suggested actions match this NDO’s nature
            {#if economicMode}
              and inventoriable mode ({economicMode})
            {/if}.
          {/if}
        </p>
      </div>

      {#if formSpec.agents.mode === 'unilateralSame'}
        <AgentPubkeyField
          id="e-agent"
          label={formSpec.agents.singleLabel}
          bind:value={providerB64}
          {members}
          hint="Pick a member or paste a full agent pubkey."
        />
      {:else}
        <AgentPubkeyField
          id="e-provider"
          label={formSpec.agents.providerLabel}
          bind:value={providerB64}
          {members}
          hint="Pick a member or paste a full agent pubkey."
        />
        <AgentPubkeyField
          id="e-receiver"
          label={formSpec.agents.receiverLabel}
          bind:value={receiverB64}
          {members}
          hint="Who receives this event."
        />
      {/if}

      {#if showResourceHashUi}
        {#if hashPrompt.kind === 'loading'}
          <p class="text-sm text-gray-500">Looking up inventoried resources…</p>
        {:else if hashPrompt.kind === 'digital' || hashPrompt.kind === 'missing'}
          <p
            class="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900"
            role="status"
          >
            {hashPrompt.message}
          </p>
        {:else if hashPrompt.kind === 'locked'}
          <div>
            <label class="mb-1 block text-sm font-medium text-gray-700" for="e-res"
              >{formSpec.resourceHash.label}</label
            >
            <input
              id="e-res"
              type="text"
              value={resourceHashB64}
              readonly
              class="w-full rounded border border-gray-200 bg-gray-50 px-3 py-2 font-mono text-xs text-gray-700"
            />
            <p class="mt-1 text-xs text-gray-500">
              Seeded with this {economicMode === 'Consume' ? 'batch' : 'held thing'} — a second
              inventoriable resource would be a different NDO.
            </p>
          </div>
        {:else}
          <div>
            <label class="mb-1 block text-sm font-medium text-gray-700" for="e-res"
              >{formSpec.resourceHash.label}</label
            >
            <input
              id="e-res"
              type="text"
              bind:value={resourceHashB64}
              class="w-full rounded border border-gray-300 px-3 py-2 font-mono text-xs"
            />
          </div>
        {/if}
      {:else if hashPrompt.kind === 'digital' || hashPrompt.kind === 'missing'}
        <p
          class="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900"
          role="status"
        >
          {hashPrompt.message}
        </p>
      {/if}

      {#if showResourceQtyUi}
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="mb-1 block text-sm font-medium text-gray-700" for="e-qty"
              >Quantity{formSpec.resourceQuantity.presence === 'optional'
                ? ' (optional)'
                : ''}</label
            >
            <input
              id="e-qty"
              type="number"
              bind:value={quantity}
              class="w-full rounded border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium text-gray-700" for="e-unit">Unit</label>
            <input
              id="e-unit"
              type="text"
              bind:value={unit}
              placeholder="each"
              class="w-full rounded border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
        </div>
      {/if}

      {#if formSpec.note.presence !== 'hidden'}
        <div>
          <label class="mb-1 block text-sm text-gray-600" for="e-note">Note</label>
          <textarea
            id="e-note"
            rows="2"
            bind:value={note}
            class="w-full rounded border border-gray-200 px-3 py-2 text-sm"
          ></textarea>
        </div>
      {/if}

      {#if formSpec.phase2.length > 0}
        <p class="rounded border border-gray-100 bg-gray-50 px-3 py-2 text-xs text-gray-600">
          Coming next: {formSpec.phase2.map((p) => p.label).join(', ')} (Phase 2 schema).
        </p>
      {/if}

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
        disabled={isSubmitting ||
          dryRunPending ||
          hardViolations.length > 0 ||
          hashPrompt.kind === 'loading' ||
          hashPrompt.kind === 'missing' ||
          hashPrompt.kind === 'digital' ||
          (showResourceHashUi && hashPrompt.kind === 'locked' && !resourceHashB64) ||
          (showResourceHashUi && hashPrompt.kind === 'entry' && !resourceHashB64)}
        onclick={handleSubmit}
        class="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {isSubmitting ? 'Logging…' : 'Log event'}
      </button>
    </div>
  </div>
</div>
