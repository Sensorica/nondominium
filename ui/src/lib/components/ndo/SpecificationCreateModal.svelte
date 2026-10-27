<script lang="ts">
  import type { ActionHash, CellId } from '@holochain/client';
  import type { LifecycleStage, PropertyRegime, ResourceScope } from '@nondominium/shared-types';
  import { resourceStore } from '$lib/stores/resource.store.svelte';

  interface Props {
    ndoActionHash: ActionHash;
    /** The NDO's own clone cell; null for legacy NDOs in the shared cell. */
    ndoCellId?: CellId | null;
    lifecycleStage: LifecycleStage | string | null;
    /** Layer 0 property regime; drives the scope lock (REQ-RES-03). */
    propertyRegime?: PropertyRegime | string | null;
    onclose: () => void;
    oncreated?: () => void;
  }

  let {
    ndoActionHash,
    ndoCellId = null,
    lifecycleStage,
    propertyRegime = null,
    onclose,
    oncreated
  }: Props = $props();

  const ineligibleStages = new Set(['Ideation', 'Hibernating', 'Deprecated', 'EndOfLife']);
  const canCreate = $derived(!lifecycleStage || !ineligibleStages.has(lifecycleStage));

  let name = $state('');
  let description = $state('');
  let category = $state('general');
  let imageUrl = $state('');
  let tagsRaw = $state('');
  // Nondominium is uncapturable by design and Public is open-access by the stewarding
  // body's policy. A Project- or Network-scoped spec is omitted from the global discovery
  // anchor, so narrowing either one is enclosure by visibility (REQ-RES-03). Integrity
  // rejects it; the form must not offer it in the first place.
  const openAccessRegimes = new Set(['Nondominium', 'Public']);
  const scopeLocked = $derived(!!propertyRegime && openAccessRegimes.has(propertyRegime));

  let chosenScope = $state<ResourceScope>('Project');
  const scope = $derived<ResourceScope>(scopeLocked ? 'Public' : chosenScope);
  let isSubmitting = $state(false);
  let errorMessage = $state('');

  async function handleSubmit() {
    if (!canCreate) {
      errorMessage = `Cannot activate Layer 1 while the NDO is ${lifecycleStage}.`;
      return;
    }
    if (!name.trim() || !description.trim()) {
      errorMessage = 'Name and description are required.';
      return;
    }
    isSubmitting = true;
    errorMessage = '';
    const tags = tagsRaw
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    const out = await resourceStore.createResourceSpecification(
      {
        name: name.trim(),
        description: description.trim(),
        category: category.trim() || 'general',
        ...(imageUrl.trim() && { image_url: imageUrl.trim() }),
        tags,
        scope,
        ndo_identity_hash: ndoActionHash,
        governance_rules: []
      },
      ndoCellId ?? undefined
    );
    isSubmitting = false;
    if (out) {
      oncreated?.();
      onclose();
    } else {
      errorMessage = resourceStore.errorMessage ?? 'Failed to create resource specification.';
    }
  }
</script>

<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
  <div
    class="relative w-full max-w-lg rounded-xl border border-gray-200 bg-white shadow-xl"
    role="dialog"
    aria-modal="true"
    aria-labelledby="spec-create-title"
  >
    <div class="border-b border-gray-100 px-6 py-4">
      <h2 id="spec-create-title" class="text-lg font-semibold text-gray-900">
        Create resource specification
      </h2>
      <p class="mt-1 text-sm text-gray-500">
        Activate Layer 1 for this NDO. Governance rules can be added afterward.
      </p>
    </div>

    <div class="max-h-[70vh] space-y-4 overflow-y-auto px-6 py-4">
      {#if !canCreate}
        <p class="rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          Layer 1 cannot be activated while the NDO is in
          <span class="font-semibold">{lifecycleStage}</span>. Advance the lifecycle stage first
          (Specification or later, excluding Hibernating / Deprecated / EndOfLife).
        </p>
      {:else}
        <div>
          <label class="mb-1 block text-sm font-medium text-gray-700" for="spec-name">Name *</label>
          <input
            id="spec-name"
            type="text"
            bind:value={name}
            class="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div>
          <label class="mb-1 block text-sm font-medium text-gray-700" for="spec-desc"
            >Description *</label
          >
          <textarea
            id="spec-desc"
            rows="3"
            bind:value={description}
            class="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          ></textarea>
        </div>
        <div>
          <label class="mb-1 block text-sm font-medium text-gray-700" for="spec-cat">Category</label>
          <input
            id="spec-cat"
            type="text"
            bind:value={category}
            class="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div>
          <label class="mb-1 block text-sm font-medium text-gray-700" for="spec-scope">Scope</label>
          <select
            id="spec-scope"
            value={scope}
            disabled={scopeLocked}
            onchange={(e) => (chosenScope = e.currentTarget.value as ResourceScope)}
            class="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500"
          >
            <option value="Project">Project</option>
            <option value="Network">Network</option>
            <option value="Public">Public</option>
          </select>
          <p class="mt-1 text-xs text-gray-500">
            {#if scopeLocked}
              A {propertyRegime} NDO is open access, so its specification is always Public. Narrowing
              the scope would hide it from the global discovery anchor (REQ-RES-03).
            {:else}
              Project-scoped specs are omitted from the global discovery anchor.
            {/if}
          </p>
        </div>
        <div>
          <label class="mb-1 block text-sm text-gray-600" for="spec-tags"
            >Tags <span class="text-gray-400">(comma-separated)</span></label
          >
          <input
            id="spec-tags"
            type="text"
            bind:value={tagsRaw}
            class="w-full rounded border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div>
          <label class="mb-1 block text-sm text-gray-600" for="spec-img"
            >Image URL <span class="text-gray-400">(optional)</span></label
          >
          <input
            id="spec-img"
            type="url"
            bind:value={imageUrl}
            class="w-full rounded border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
      {/if}

      {#if errorMessage}
        <p class="rounded border border-red-200 bg-red-50 p-2 text-sm text-red-700">{errorMessage}</p>
      {/if}
    </div>

    <div class="flex justify-end gap-2 border-t border-gray-100 px-6 py-4">
      <button
        type="button"
        onclick={onclose}
        class="rounded px-4 py-2 text-sm text-gray-600 hover:bg-gray-100">Cancel</button
      >
      <button
        type="button"
        disabled={isSubmitting || !canCreate}
        onclick={handleSubmit}
        class="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {isSubmitting ? 'Creating…' : 'Create specification'}
      </button>
    </div>
  </div>
</div>
