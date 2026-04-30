<script lang="ts">
  import type { NdoDescriptor } from '@nondominium/shared-types';
  import NdoCard from './NdoCard.svelte';

  interface Props {
    descriptors: NdoDescriptor[];
    isLoading?: boolean;
    errorMessage?: string | null;
  }

  let { descriptors, isLoading = false, errorMessage = null }: Props = $props();
</script>

<section class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
  <div class="mb-3 flex items-center justify-between">
    <h2 class="text-lg font-semibold text-gray-900">NDO browser</h2>
    {#if isLoading}
      <span class="text-sm text-gray-500">Loading…</span>
    {/if}
  </div>
  {#if errorMessage}
    <p class="mb-3 rounded border border-red-200 bg-red-50 p-2 text-sm text-red-700">{errorMessage}</p>
  {/if}
  {#if descriptors.length === 0 && !isLoading}
    <p class="text-sm text-gray-500">No resource specifications yet. Create one from the conductor tests or zome calls.</p>
  {:else}
    <ul class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {#each descriptors as d (d.hash)}
        <li>
          <NdoCard descriptor={d} />
        </li>
      {/each}
    </ul>
  {/if}
</section>
