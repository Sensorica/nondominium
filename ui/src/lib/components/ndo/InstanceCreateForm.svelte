<script lang="ts">
  import type { ActionHash, CellId } from '@holochain/client';
  import { resourceStore } from '$lib/stores/resource.store.svelte';

  interface Props {
    specHash: ActionHash;
    specName: string;
    defaultUnit?: string | null;
    cellId?: CellId | null;
    oncreated: () => void;
  }

  let { specHash, specName, defaultUnit = null, cellId = null, oncreated }: Props = $props();

  let quantity = $state('1');
  let unit = $state(defaultUnit?.trim() || 'each');
  let location = $state('');
  let pending = $state(false);
  let errorMessage = $state<string | null>(null);

  async function submit() {
    errorMessage = null;
    const numerical = Number(quantity);
    if (!Number.isFinite(numerical) || numerical <= 0) {
      errorMessage = 'Quantity must be a positive number.';
      return;
    }
    const hasUnit = unit.trim() || 'each';
    pending = true;
    const hash = await resourceStore.createEconomicResource(
      {
        spec_hash: specHash,
        quantity: { numerical_value: numerical, has_unit: hasUnit },
        ...(location.trim() ? { current_location: location.trim() } : {})
      },
      cellId ?? undefined
    );
    pending = false;
    if (!hash) {
      errorMessage = resourceStore.errorMessage ?? 'Could not create the resource instance.';
      return;
    }
    quantity = '1';
    location = '';
    oncreated();
  }
</script>

<form
  class="mt-3 space-y-2 rounded border border-dashed border-gray-200 p-3"
  onsubmit={(event) => {
    event.preventDefault();
    void submit();
  }}
>
  <p class="text-xs font-medium text-gray-700">Add an instance of {specName}</p>
  <div class="grid grid-cols-2 gap-2">
    <label class="block text-xs text-gray-600">
      Quantity
      <input
        type="number"
        min="0"
        step="any"
        bind:value={quantity}
        class="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
      />
    </label>
    <label class="block text-xs text-gray-600">
      Unit
      <input
        type="text"
        bind:value={unit}
        class="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
      />
    </label>
  </div>
  <label class="block text-xs text-gray-600">
    Location
    <input
      type="text"
      bind:value={location}
      placeholder="Optional"
      class="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
    />
  </label>
  {#if errorMessage}
    <p class="text-xs text-red-700">{errorMessage}</p>
  {/if}
  <button
    type="submit"
    disabled={pending}
    class="rounded bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
  >
    {pending ? 'Creating…' : 'Create instance'}
  </button>
</form>
