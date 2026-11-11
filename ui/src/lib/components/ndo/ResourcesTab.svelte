<script lang="ts">
  import type { ActionHash, CellId } from '@holochain/client';
  import { decodeHashFromBase64, encodeHashToBase64 } from '@holochain/client';
  import { ResourcesPanel } from '@nondominium/ndo-ui';
  import type {
    CreateInstanceInput,
    ResourceSpecificationInput as NdoUiSpecInput
  } from '@nondominium/ndo-ui';
  import type {
    LifecycleStage,
    NdoDescriptor,
    PropertyRegime,
    ResourceSpecificationListing
  } from '@nondominium/shared-types';
  import type { EconomicResourceRow } from '$lib/utils/holochain-records';
  import { operationalStateLabel } from '$lib/utils/operational-state-labels';
  import { getNdoStore, isTaskInterrupted } from '$lib/stores/ndo.store.svelte';
  import { resourceStore } from '$lib/stores/resource.store.svelte';
  import {
    fromNdoUiSpecInput,
    toNdoUiDescriptor,
    toNdoUiSpecifications
  } from '$lib/utils/ndo-ui-adapters';
  import { happNdoUiProfile } from '$lib/utils/ndo-ui-profile';
  interface Props {
    /** NDO Layer 0 action hash (prop name kept for NdoView compatibility). */
    specActionHash: ActionHash;
    /** The NDO's own clone cell; null for legacy NDOs in the shared cell. */
    ndoCellId?: CellId | null;
    lifecycleStage?: LifecycleStage | string | null;
    /** Layer 0 property regime; forwarded so the create form can lock scope (REQ-RES-03). */
    propertyRegime?: PropertyRegime | string | null;
    /** Full NDO descriptor for ResourcesPanel chrome (nature, name, stage). */
    ndoDescriptor?: NdoDescriptor | null;
  }

  let {
    specActionHash,
    ndoCellId = null,
    lifecycleStage = null,
    propertyRegime = null,
    ndoDescriptor = null
  }: Props = $props();

  const ndo = getNdoStore();

  let listings = $state<ResourceSpecificationListing[]>([]);
  let instancesBySpec = $state<Record<string, { action_hash: string; quantity: number; unit: string; operational_state: string }>>({});
  let loadError = $state<string | null>(null);
  let formError = $state<string | null>(null);

  const panelDescriptor = $derived.by((): NdoDescriptor => {
    if (ndoDescriptor) return ndoDescriptor;
    return {
      hash: encodeHashToBase64(specActionHash),
      name: 'NDO',
      lifecycle_stage: lifecycleStage ? String(lifecycleStage) : null,
      property_regime: propertyRegime ? String(propertyRegime) : null,
      resource_nature: null,
      description: null,
      initiator: null,
      created_at: null,
      successor_ndo_hash: null,
      hibernation_origin: null,
      rivalry_override: null
    };
  });

  const uiSpecs = $derived(
    toNdoUiSpecifications(listings, {
      activatedAtStage: lifecycleStage ? String(lifecycleStage) : null
    })
  );

  const uiProfile = $derived(
    happNdoUiProfile({
      descriptor: ndoDescriptor,
      resourceNature: ndoDescriptor?.resource_nature ?? panelDescriptor.resource_nature,
      propertyRegime: ndoDescriptor?.property_regime ?? panelDescriptor.property_regime,
      economicMode: ndoDescriptor?.economic_mode ?? null,
      useKind: ndoDescriptor?.use_kind ?? null,
      existingSpecCount: listings.length,
      hasInventoriableResource: Object.values(instancesBySpec).some((rows) => rows.length > 0)
    })
  );
  const allowsManualKindCreate = $derived(uiProfile.resources.allowSpecCreate);
  const allowsManualInstanceCreate = $derived(uiProfile.resources.allowInstanceCreate);

  async function load() {
    let rows;
    try {
      rows = await ndo().specificationsWithInstances((specs) => {
        listings = specs;
      });
    } catch (error) {
      if (isTaskInterrupted(error)) return;
      throw error;
    }
    listings = rows.map((row) => row.listing);
    const next: typeof instancesBySpec = {};
    for (const row of rows) {
      const panelKey = encodeHashToBase64(row.listing.action_hash);
      next[panelKey] = row.instances.map((inst: EconomicResourceRow) => ({
        action_hash: encodeHashToBase64(inst.actionHash),
        quantity: inst.resource.quantity.numerical_value,
        unit: inst.resource.quantity.has_unit,
        operational_state: operationalStateLabel(inst.resource.operational_state)
      }));
    }
    instancesBySpec = next;
    loadError = null;
  }

  $effect(() => {
    void specActionHash;
    void ndoCellId;
    void load();
  });

  async function handleCreate(input: NdoUiSpecInput) {
    formError = null;
    const payload = fromNdoUiSpecInput(input, specActionHash);
    const out = await resourceStore.createResourceSpecification(
      payload,
      ndoCellId ?? undefined
    );
    if (!out) {
      formError = resourceStore.errorMessage ?? 'Failed to create resource specification.';
      throw new Error(formError);
    }
    await load();
  }

  async function handleUpdate(actionHashB64: string, input: NdoUiSpecInput) {
    formError = null;
    const original = decodeHashFromBase64(actionHashB64) as ActionHash;
    const payload = fromNdoUiSpecInput(input, specActionHash);
    const cell = ndoCellId ?? undefined;

    const latest = await resourceStore.getLatestResourceSpecificationRecord(original, cell);
    const previous = latest?.actionHash ?? original;

    const updateHash = await resourceStore.updateResourceSpecification(
      {
        original_action_hash: original,
        previous_action_hash: previous,
        updated_specification: payload
      },
      cell
    );
    if (!updateHash) {
      formError = resourceStore.errorMessage ?? 'Failed to update resource specification.';
      throw new Error(formError);
    }
    await load();
  }

  async function handleCreateInstance(input: CreateInstanceInput) {
    formError = null;
    const specHash = decodeHashFromBase64(input.spec_action_hash) as ActionHash;
    const created = await resourceStore.createEconomicResource(
      {
        spec_hash: specHash,
        quantity: { numerical_value: input.quantity, has_unit: input.unit }
      },
      ndoCellId ?? undefined
    );
    if (!created) {
      formError = resourceStore.errorMessage ?? 'Failed to create economic resource.';
      throw new Error(formError);
    }
    await load();
  }
</script>

<div class="space-y-6">
  {#if formError}
    <p class="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</p>
  {/if}

  {#if loadError}
    <p class="text-sm text-red-600">{loadError}</p>
  {/if}

  <ResourcesPanel
    descriptor={toNdoUiDescriptor(panelDescriptor)}
    specifications={uiSpecs}
    {instancesBySpec}
    oncreate={allowsManualKindCreate ? handleCreate : undefined}
    onupdate={handleUpdate}
    oncreateinstance={allowsManualInstanceCreate ? handleCreateInstance : undefined}
  />
</div>
