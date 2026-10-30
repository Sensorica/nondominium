<script lang="ts">
  import type { ActionHash, CellId } from '@holochain/client';
  import { decodeHashFromBase64, encodeHashToBase64 } from '@holochain/client';
  import { ResourcesPanel } from '@nondominium/ndo-ui';
  import type { ResourceSpecificationInput as NdoUiSpecInput } from '@nondominium/ndo-ui';
  import type {
    LifecycleStage,
    NdoDescriptor,
    PropertyRegime,
    ResourceSpecificationListing
  } from '@nondominium/shared-types';
  import type { EconomicResourceRow } from '$lib/utils/holochain-records';
  import { operationalStateLabel } from '$lib/utils/operational-state-labels';
  import { getNdoStore, isTaskInterrupted } from '$lib/stores/ndo.store.svelte';
  import InstanceCreateForm from './InstanceCreateForm.svelte';
  import { resourceStore } from '$lib/stores/resource.store.svelte';
  import {
    fromNdoUiSpecInput,
    toNdoUiDescriptor,
    toNdoUiSpecifications
  } from '$lib/utils/ndo-ui-adapters';
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
  let instancesBySpec = $state<Map<string, EconomicResourceRow[]>>(new Map());
  let loadError = $state<string | null>(null);
  let formError = $state<string | null>(null);
  let copiedHash = $state<string | null>(null);

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
    const next = new Map<string, EconomicResourceRow[]>();
    for (const row of rows) next.set(row.listing.action_hash.toString(), row.instances);
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

  async function copyInstanceHash(hash: ActionHash) {
    const b64 = encodeHashToBase64(hash);
    try {
      await navigator.clipboard.writeText(b64);
      copiedHash = b64;
      setTimeout(() => {
        if (copiedHash === b64) copiedHash = null;
      }, 2000);
    } catch {
      copiedHash = null;
    }
  }
</script>

<div class="space-y-6">
  {#if formError}
    <p class="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</p>
  {/if}

  <ResourcesPanel
    descriptor={toNdoUiDescriptor(panelDescriptor)}
    specifications={uiSpecs}
    oncreate={handleCreate}
    onupdate={handleUpdate}
  />

  {#if loadError}
    <p class="text-sm text-red-600">{loadError}</p>
  {:else if listings.length > 0}
    <section class="space-y-3">
      <h3 class="text-sm font-semibold text-gray-800">Inventoried instances</h3>
      <p class="text-xs text-gray-500">
        A quantity of a kind, held on this NDO. New instances start pending validation. The action
        hash is what an economic event records.
      </p>
      {#each listings as listing (listing.action_hash.toString())}
        {@const instances = instancesBySpec.get(listing.action_hash.toString()) ?? []}
        <div class="rounded border border-gray-200 bg-white p-4">
          <div class="font-medium text-gray-900">{listing.specification.name}</div>
          <h4 class="mt-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
            Economic resources
          </h4>
          {#if instances.length === 0}
            <p class="mt-1 text-sm text-gray-500">No inventoried resources for this specification.</p>
          {:else}
            <ul class="mt-1 space-y-2">
              {#each instances as row (encodeHashToBase64(row.actionHash))}
                {@const hashB64 = encodeHashToBase64(row.actionHash)}
                <li class="rounded border border-gray-100 bg-gray-50 px-3 py-2 text-sm">
                  <div>
                    <span class="font-medium">Qty</span>
                    {row.resource.quantity.numerical_value}
                    {row.resource.quantity.has_unit} ·
                    <span class="font-medium">Operational state</span>
                    {operationalStateLabel(row.resource.operational_state)}
                  </div>
                  <div class="mt-1 flex items-center gap-2">
                    <span class="font-mono text-xs text-gray-500">{hashB64.slice(0, 20)}…</span>
                    <button
                      type="button"
                      class="text-xs text-blue-700 underline"
                      onclick={() => void copyInstanceHash(row.actionHash)}
                    >
                      {copiedHash === hashB64 ? 'Copied' : 'Copy action hash'}
                    </button>
                  </div>
                </li>
              {/each}
            </ul>
          {/if}
          <InstanceCreateForm
            specHash={listing.action_hash}
            specName={listing.specification.name}
            defaultUnit={listing.specification.default_unit}
            cellId={ndoCellId}
            oncreated={() => {
              void load();
            }}
          />
        </div>
      {/each}
    </section>
  {/if}
</div>
