<script lang="ts">
  import type { ActionHash } from '@holochain/client';
  import type { EconomicResourceRow } from '$lib/utils/holochain-records';
  import { onMount } from 'svelte';
  import { Effect as E, Exit, pipe } from 'effect';
  import { resourceStore } from '$lib/stores/resource.store.svelte';
  import {
    ResourceServiceTag,
    ResourceServiceResolved
  } from '$lib/services/zomes/resource.service';

  interface Props {
    specActionHash: ActionHash;
  }

  let { specActionHash }: Props = $props();

  let instances = $state<EconomicResourceRow[]>([]);
  let loadError = $state<string | null>(null);

  const specName = $derived(
    resourceStore.resourceSpecificationListings.find(
      (l) => l.action_hash.toString() === specActionHash.toString()
    )?.specification.name ?? 'This specification'
  );

  onMount(() => {
    void (async () => {
      await resourceStore.fetchAllResourceSpecifications();
      const program = E.gen(function* () {
        const svc = yield* ResourceServiceTag;
        return yield* svc.getResourcesBySpecification(specActionHash);
      });
      const exit = await E.runPromiseExit(pipe(program, E.provide(ResourceServiceResolved)));
      if (Exit.isFailure(exit)) {
        loadError = 'Failed to load economic resources';
        instances = [];
        return;
      }
      instances = exit.value;
      loadError = null;
    })();
  });
</script>

<div class="space-y-4">
  <h3 class="text-base font-semibold text-gray-900">Specification</h3>
  <p class="text-sm text-gray-600">{specName}</p>

  <h3 class="text-base font-semibold text-gray-900">All resource specifications</h3>
  <div class="overflow-x-auto rounded border border-gray-200">
    <table class="min-w-full text-left text-sm">
      <thead class="bg-gray-50 text-gray-600">
        <tr>
          <th class="px-3 py-2">Name</th>
          <th class="px-3 py-2">Category</th>
          <th class="px-3 py-2">Active</th>
        </tr>
      </thead>
      <tbody>
        {#each resourceStore.resourceSpecificationListings as listing (listing.action_hash.toString())}
          <tr
            class:bg-blue-50={listing.action_hash.toString() === specActionHash.toString()}
            class="border-t border-gray-100"
          >
            <td class="px-3 py-2 font-medium">{listing.specification.name}</td>
            <td class="px-3 py-2">{listing.specification.category ?? '—'}</td>
            <td class="px-3 py-2">{listing.specification.is_active !== false ? 'yes' : 'no'}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>

  <h3 class="text-base font-semibold text-gray-900">Economic resources (this spec)</h3>
  {#if loadError}
    <p class="text-sm text-red-600">{loadError}</p>
  {:else if instances.length === 0}
    <p class="text-sm text-gray-500">No inventoried resources for this specification yet.</p>
  {:else}
    <ul class="space-y-2">
      {#each instances as row, i (i)}
        <li class="rounded border border-gray-200 bg-white p-3 text-sm">
          <span class="font-medium">Qty</span> {row.resource.quantity} {row.resource.unit} ·
          <span class="font-medium">State</span>
          {row.resource.state}
        </li>
      {/each}
    </ul>
  {/if}
</div>
