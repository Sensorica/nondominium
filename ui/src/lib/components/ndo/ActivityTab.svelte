<script lang="ts">
  import type { ActionHash } from '@holochain/client';
  import type { VfEconomicEvent } from '@nondominium/shared-types';
  import { onMount } from 'svelte';
  import { Effect as E, Exit, pipe } from 'effect';
  import { GovernanceServiceTag, GovernanceServiceResolved } from '$lib/services/zomes/governance.service';
  import { ResourceServiceTag, ResourceServiceResolved } from '$lib/services/zomes/resource.service';

  interface Props {
    specActionHash: ActionHash;
  }

  let { specActionHash }: Props = $props();

  let events = $state<VfEconomicEvent[]>([]);
  let loadError = $state<string | null>(null);

  onMount(() => {
    void (async () => {
      const rowsProgram = E.gen(function* () {
        const r = yield* ResourceServiceTag;
        return yield* r.getResourcesBySpecification(specActionHash);
      });
      const rowsExit = await E.runPromiseExit(
        pipe(rowsProgram, E.provide(ResourceServiceResolved))
      );
      if (Exit.isFailure(rowsExit)) {
        loadError = 'Failed to load resources for activity';
        events = [];
        return;
      }
      const rows = rowsExit.value;
      const merged: VfEconomicEvent[] = [];
      for (const row of rows) {
        const evProgram = E.gen(function* () {
          const g = yield* GovernanceServiceTag;
          return yield* g.getEventsByResource(row.actionHash);
        });
        const evExit = await E.runPromiseExit(
          pipe(evProgram, E.provide(GovernanceServiceResolved))
        );
        if (Exit.isSuccess(evExit)) {
          merged.push(...evExit.value);
        }
      }
      events = merged.sort((a, b) => Number(b.event_time) - Number(a.event_time));
      loadError = null;
    })();
  });
</script>

<div>
  <h3 class="mb-2 text-base font-semibold text-gray-900">Economic events</h3>
  <p class="mb-3 text-xs text-gray-500">
    Events are loaded per inventoried resource (`get_events_for_resource`) for all instances of this
    specification.
  </p>
  {#if loadError}
    <p class="text-sm text-red-600">{loadError}</p>
  {:else if events.length === 0}
    <p class="text-sm text-gray-500">No events recorded for resources under this specification.</p>
  {:else}
    <ul class="space-y-2">
      {#each events as ev, i (i)}
        <li class="rounded border border-gray-200 bg-white p-3 text-sm">
          <div class="font-medium text-gray-900">{ev.action}</div>
          <div class="mt-1 text-gray-600">
            Qty {ev.resource_quantity} · {new Date(Number(ev.event_time) / 1000).toLocaleString()}
          </div>
          {#if ev.note}
            <div class="mt-1 text-xs text-gray-500">{ev.note}</div>
          {/if}
        </li>
      {/each}
    </ul>
  {/if}
</div>
