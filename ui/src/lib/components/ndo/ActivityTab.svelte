<script lang="ts">
  import type { ActionHash } from '@holochain/client';
  import { encodeHashToBase64 } from '@holochain/client';
  import type {
    PropertyRegime,
    ResourceNature,
    Rivalry,
    VfCommitment,
    VfEconomicEvent
  } from '@nondominium/shared-types';
  import { Effect as E, Exit, pipe } from 'effect';
  import { GovernanceServiceTag, GovernanceServiceResolved } from '$lib/services/zomes/governance.service';
  import { ResourceServiceTag, ResourceServiceResolved } from '$lib/services/zomes/resource.service';
  import { resourceStore } from '$lib/stores/resource.store.svelte';
  import { governanceStore } from '$lib/stores/governance.store.svelte';
  import CommitmentCreateForm from './CommitmentCreateForm.svelte';
  import EconomicEventCreateForm from './EconomicEventCreateForm.svelte';

  interface Props {
    /** NDO Layer 0 action hash. */
    specActionHash: ActionHash;
    propertyRegime?: string | null;
    resourceNature?: string | null;
    rivalryOverride?: string | null;
  }

  let {
    specActionHash,
    propertyRegime = null,
    resourceNature = null,
    rivalryOverride = null
  }: Props = $props();

  let events = $state<VfEconomicEvent[]>([]);
  let commitments = $state<VfCommitment[]>([]);
  let loadError = $state<string | null>(null);
  let showCommitment = $state(false);
  let showEvent = $state(false);

  const canAct = $derived(propertyRegime != null && resourceNature != null);

  const ndoCommitments = $derived(
    commitments.filter(
      (c) => encodeHashToBase64(c.ndo_identity_hash) === encodeHashToBase64(specActionHash)
    )
  );

  const ndoEvents = $derived(
    events.filter(
      (e) => encodeHashToBase64(e.ndo_identity_hash) === encodeHashToBase64(specActionHash)
    )
  );

  async function load() {
    loadError = null;
    try {
      const all = await governanceStore.fetchAllCommitments();
      commitments = all;

      const listings = await resourceStore.fetchSpecificationsForNdo(specActionHash);
      const merged: VfEconomicEvent[] = [];
      for (const listing of listings) {
        const rowsProgram = E.gen(function* () {
          const r = yield* ResourceServiceTag;
          return yield* r.getResourcesBySpecification(listing.action_hash);
        });
        const rowsExit = await E.runPromiseExit(
          pipe(rowsProgram, E.provide(ResourceServiceResolved))
        );
        if (Exit.isFailure(rowsExit)) continue;
        for (const row of rowsExit.value) {
          const evProgram = E.gen(function* () {
            const g = yield* GovernanceServiceTag;
            return yield* g.getEventsByResource(row.actionHash);
          });
          const evExit = await E.runPromiseExit(
            pipe(evProgram, E.provide(GovernanceServiceResolved))
          );
          if (Exit.isSuccess(evExit)) merged.push(...evExit.value);
        }
      }
      // Also include any agent-wide events that carry this ndo hash
      const allEvProgram = E.gen(function* () {
        const g = yield* GovernanceServiceTag;
        return yield* g.getAllEconomicEvents();
      });
      const allEvExit = await E.runPromiseExit(
        pipe(allEvProgram, E.provide(GovernanceServiceResolved))
      );
      if (Exit.isSuccess(allEvExit)) {
        for (const ev of allEvExit.value) {
          if (
            encodeHashToBase64(ev.ndo_identity_hash) === encodeHashToBase64(specActionHash) &&
            !merged.some(
              (m) =>
                m.event_time === ev.event_time &&
                m.action === ev.action &&
                m.resource_quantity === ev.resource_quantity
            )
          ) {
            merged.push(ev);
          }
        }
      }
      events = merged.sort((a, b) => Number(b.event_time) - Number(a.event_time));
    } catch {
      loadError = 'Failed to load activity for this NDO';
      events = [];
      commitments = [];
    }
  }

  $effect(() => {
    void specActionHash;
    void load();
  });
</script>

{#if showCommitment && canAct}
  <CommitmentCreateForm
    ndoActionHash={specActionHash}
    propertyRegime={propertyRegime as PropertyRegime}
    resourceNature={resourceNature as ResourceNature}
    rivalryOverride={(rivalryOverride as Rivalry | null) ?? undefined}
    onclose={() => {
      showCommitment = false;
    }}
    oncreated={() => {
      void load();
    }}
  />
{/if}

{#if showEvent && canAct}
  <EconomicEventCreateForm
    ndoActionHash={specActionHash}
    propertyRegime={propertyRegime as PropertyRegime}
    resourceNature={resourceNature as ResourceNature}
    rivalryOverride={(rivalryOverride as Rivalry | null) ?? undefined}
    pendingCommitments={ndoCommitments}
    onclose={() => {
      showEvent = false;
    }}
    oncreated={() => {
      void load();
    }}
  />
{/if}

<div class="space-y-6">
  <div class="flex flex-wrap items-center justify-between gap-3">
    <div>
      <h3 class="text-base font-semibold text-gray-900">Activity</h3>
      <p class="text-xs text-gray-500">
        Commitments and events for this NDO (client-filtered by <code>ndo_identity_hash</code>).
      </p>
    </div>
    <div class="flex gap-2">
      <button
        type="button"
        disabled={!canAct}
        onclick={() => {
          showCommitment = true;
        }}
        class="rounded bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        + New commitment
      </button>
      <button
        type="button"
        disabled={!canAct}
        onclick={() => {
          showEvent = true;
        }}
        class="rounded border border-blue-300 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-50"
      >
        + New event
      </button>
    </div>
  </div>

  {#if loadError}
    <p class="text-sm text-red-600">{loadError}</p>
  {/if}

  <section>
    <h4 class="mb-2 text-sm font-semibold text-gray-800">Commitments</h4>
    {#if ndoCommitments.length === 0}
      <p class="text-sm text-gray-500">No commitments for this NDO yet.</p>
    {:else}
      <ul class="space-y-2">
        {#each ndoCommitments as c, i (i)}
          <li class="rounded border border-gray-200 bg-white p-3 text-sm">
            <div class="font-medium text-gray-900">{c.action}</div>
            <div class="mt-1 text-gray-600">
              Due {new Date(Number(c.due_date) / 1000).toLocaleString()}
            </div>
            {#if c.note}
              <div class="mt-1 text-xs text-gray-500">{c.note}</div>
            {/if}
          </li>
        {/each}
      </ul>
    {/if}
  </section>

  <section>
    <h4 class="mb-2 text-sm font-semibold text-gray-800">Economic events</h4>
    {#if ndoEvents.length === 0}
      <p class="text-sm text-gray-500">No events recorded for this NDO yet.</p>
    {:else}
      <ul class="space-y-2">
        {#each ndoEvents as ev, i (i)}
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
  </section>
</div>
