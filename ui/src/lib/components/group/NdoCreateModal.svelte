<script lang="ts">
  import type {
    LifecycleStage,
    NdoDescriptor,
    NdoInput,
    PropertyRegime,
    ResourceNature
  } from '@nondominium/shared-types';
  import { goto } from '$app/navigation';
  import { groupStore } from '$lib/stores/group.store.svelte';
  import { lobbyStore } from '$lib/stores/lobby.store.svelte';

  interface Props {
    groupId: string;
    onclose: () => void;
  }

  let { groupId, onclose }: Props = $props();

  const initialStages: LifecycleStage[] = ['Ideation', 'Specification', 'Development', 'Stable', 'Hibernating'];
  const allRegimes: PropertyRegime[] = ['Private', 'Commons', 'Nondominium', 'CommonPool'];
  const allNatures: ResourceNature[] = ['Physical', 'Digital', 'Service', 'Hybrid', 'Information'];

  let name = $state('');
  let property_regime = $state<PropertyRegime>('Commons');
  let resource_nature = $state<ResourceNature>('Physical');
  let lifecycle_stage = $state<LifecycleStage>('Ideation');
  let description = $state('');
  let isSubmitting = $state(false);
  let errorMessage = $state('');

  const nameWarning = $derived(
    name.trim() &&
      lobbyStore.ndos.some((d: NdoDescriptor) => d.name.toLowerCase() === name.trim().toLowerCase())
      ? 'An NDO with this name already exists in the Lobby.'
      : ''
  );

  const regimeTooltips: Record<PropertyRegime, string> = {
    Private: 'Owned and controlled by a single agent.',
    Commons: 'Shared, self-governed resource open to a defined community.',
    Nondominium: 'Cannot be captured or exclusively owned; maximally open.',
    CommonPool: 'A commons with a defined boundary and subtractable access.'
  };

  const natureTooltips: Record<ResourceNature, string> = {
    Physical: 'A tangible, material resource.',
    Digital: 'An intangible, bit-based resource (software, data, etc.).',
    Service: 'A time-based provision of capability or skill.',
    Hybrid: 'A resource with both physical and digital dimensions.',
    Information: 'Knowledge, documentation, or structured data.'
  };

  async function handleSubmit() {
    if (!name.trim()) {
      errorMessage = 'Name is required.';
      return;
    }
    isSubmitting = true;
    errorMessage = '';
    const input: NdoInput = {
      name: name.trim(),
      property_regime,
      resource_nature,
      lifecycle_stage,
      ...(description.trim() && { description: description.trim() })
    };
    const hashB64 = await groupStore.createNdo(input);
    isSubmitting = false;
    if (hashB64) {
      onclose();
      await goto(`/group/${encodeURIComponent(groupId)}`);
    } else {
      errorMessage = groupStore.errorMessage ?? 'Failed to create NDO.';
    }
  }
</script>

<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
  <div
    class="relative w-full max-w-lg rounded-xl border border-gray-200 bg-white shadow-xl"
    role="dialog"
    aria-modal="true"
    aria-labelledby="ndo-create-title"
  >
    <div class="border-b border-gray-100 px-6 py-4">
      <h2 id="ndo-create-title" class="text-lg font-semibold text-gray-900">Create NDO</h2>
      <p class="mt-1 text-sm text-gray-500">
        Register a new NondominiumIdentity Layer 0 within this group.
      </p>
    </div>

    <div class="max-h-[70vh] overflow-y-auto px-6 py-4 space-y-4">
      <!-- Name -->
      <div>
        <label class="mb-1 block text-sm font-medium text-gray-700" for="ndo-name">
          Name <span class="text-red-500">*</span>
        </label>
        <input
          id="ndo-name"
          type="text"
          bind:value={name}
          placeholder="Unique identifier for this NDO"
          class="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        {#if nameWarning}
          <p class="mt-1 text-xs text-amber-600">{nameWarning}</p>
        {/if}
      </div>

      <!-- Property Regime -->
      <div>
        <label class="mb-1 block text-sm font-medium text-gray-700" for="ndo-regime">
          Property Regime
        </label>
        <select
          id="ndo-regime"
          bind:value={property_regime}
          class="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        >
          {#each allRegimes as r}
            <option value={r}>{r}</option>
          {/each}
        </select>
        <p class="mt-1 text-xs text-gray-500">{regimeTooltips[property_regime]}</p>
      </div>

      <!-- Resource Nature -->
      <div>
        <label class="mb-1 block text-sm font-medium text-gray-700" for="ndo-nature">
          Resource Nature
        </label>
        <select
          id="ndo-nature"
          bind:value={resource_nature}
          class="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        >
          {#each allNatures as n}
            <option value={n}>{n}</option>
          {/each}
        </select>
        <p class="mt-1 text-xs text-gray-500">{natureTooltips[resource_nature]}</p>
      </div>

      <!-- Lifecycle Stage -->
      <div>
        <label class="mb-1 block text-sm font-medium text-gray-700" for="ndo-stage">
          Initial Lifecycle Stage
        </label>
        <select
          id="ndo-stage"
          bind:value={lifecycle_stage}
          class="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        >
          {#each initialStages as s}
            <option value={s}>{s}</option>
          {/each}
        </select>
        <p class="mt-1 text-xs text-gray-500">New NDOs start in early stages of maturity.</p>
      </div>

      <!-- Description -->
      <div>
        <label class="mb-1 block text-sm text-gray-600" for="ndo-desc">
          Description <span class="text-gray-400">(optional)</span>
        </label>
        <textarea
          id="ndo-desc"
          bind:value={description}
          rows="3"
          placeholder="What is this NDO about?"
          class="w-full rounded border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        ></textarea>
      </div>

      {#if errorMessage}
        <p class="rounded border border-red-200 bg-red-50 p-2 text-sm text-red-700">
          {errorMessage}
        </p>
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
      <button
        type="button"
        disabled={isSubmitting}
        onclick={handleSubmit}
        class="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {isSubmitting ? 'Creating…' : 'Create NDO'}
      </button>
    </div>
  </div>
</div>
