<script lang="ts">
  import type { ActionHash, CellId } from '@holochain/client';
  import { encodeHashToBase64 } from '@holochain/client';
  import type {
    CommitmentRecord,
    PropertyRegime,
    ResourceNature,
    Rivalry,
    VfEconomicEvent
  } from '@nondominium/shared-types';
  import { getNdoStore, isTaskInterrupted } from '$lib/stores/ndo.store.svelte';
  import { groupStore } from '$lib/stores/group.store.svelte';
  import { mergeAgentOptions, type AgentMemberOption } from '$lib/utils/agent-pubkey';
  import CommitmentCreateForm from './CommitmentCreateForm.svelte';
  import EconomicEventCreateForm from './EconomicEventCreateForm.svelte';
  import AdmitToPoolModal from './AdmitToPoolModal.svelte';
  import FulfillCommitmentModal from './FulfillCommitmentModal.svelte';
  import ParticipationClaimsPanel from './ParticipationClaimsPanel.svelte';

  interface Props {
    /** NDO Layer 0 action hash. */
    specActionHash: ActionHash;
    /** The NDO's own clone cell; null for legacy NDOs in the shared cell. */
    ndoCellId?: CellId | null;
    propertyRegime?: string | null;
    resourceNature?: string | null;
    rivalryOverride?: string | null;
    /** NDO members (nickname + full pubkey id) for provider/receiver pickers. */
    ndoMembers?: AgentMemberOption[];
  }

  let {
    specActionHash,
    ndoCellId = null,
    propertyRegime = null,
    resourceNature = null,
    rivalryOverride = null,
    ndoMembers = []
  }: Props = $props();

  const pickerMembers = $derived(
    mergeAgentOptions(ndoMembers, groupStore.members as AgentMemberOption[])
  );

  const ndo = getNdoStore();

  let events = $state<VfEconomicEvent[]>([]);
  let records = $state<CommitmentRecord[]>([]);
  let loadError = $state<string | null>(null);
  let showCommitment = $state(false);
  let showEvent = $state(false);
  let admitTarget = $state<CommitmentRecord | null>(null);
  let fulfillTarget = $state<CommitmentRecord | null>(null);

  const canAct = $derived(propertyRegime != null && resourceNature != null);

  const ndoCommitments = $derived(records.map((r) => r.commitment));

  async function load() {
    loadError = null;
    try {
      const activity = await ndo().activity();
      records = activity.records;
      events = activity.events;
    } catch (error) {
      if (isTaskInterrupted(error)) return;
      loadError = 'Failed to load activity for this NDO';
      events = [];
      records = [];
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
    {ndoCellId}
    propertyRegime={propertyRegime as PropertyRegime}
    resourceNature={resourceNature as ResourceNature}
    rivalryOverride={(rivalryOverride as Rivalry | null) ?? undefined}
    members={pickerMembers}
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
    {ndoCellId}
    propertyRegime={propertyRegime as PropertyRegime}
    resourceNature={resourceNature as ResourceNature}
    rivalryOverride={(rivalryOverride as Rivalry | null) ?? undefined}
    pendingCommitments={ndoCommitments}
    members={pickerMembers}
    onclose={() => {
      showEvent = false;
    }}
    oncreated={() => {
      void load();
    }}
  />
{/if}

{#if admitTarget}
  <AdmitToPoolModal
    identityHash={specActionHash}
    commitmentHash={admitTarget.action_hash}
    onclose={() => {
      admitTarget = null;
    }}
  />
{/if}

{#if fulfillTarget}
  <FulfillCommitmentModal
    record={fulfillTarget}
    {ndoCellId}
    onclose={() => {
      fulfillTarget = null;
    }}
    onfulfilled={() => {
      void load();
    }}
  />
{/if}

<div class="space-y-6">
  <div class="flex flex-wrap items-center justify-between gap-3">
    <div>
      <h3 class="text-base font-semibold text-gray-900">Activity</h3>
      <p class="text-xs text-gray-500">
        Commitments and events for this NDO. Admit a commitment into a group-as-pool, or fulfill it
        (event + claim + bilateral PPR in one call).
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
    {#if records.length === 0}
      <p class="text-sm text-gray-500">No commitments for this NDO yet.</p>
    {:else}
      <ul class="space-y-2">
        {#each records as r (encodeHashToBase64(r.action_hash))}
          <li class="rounded border border-gray-200 bg-white p-3 text-sm">
            <div class="flex flex-wrap items-start justify-between gap-2">
              <div>
                <div class="font-medium text-gray-900">{r.commitment.action}</div>
                <div class="mt-1 text-gray-600">
                  Due {new Date(Number(r.commitment.due_date) / 1000).toLocaleString()}
                  {#if r.commitment.resource_quantity}
                    · {r.commitment.resource_quantity.numerical_value}
                    {r.commitment.resource_quantity.has_unit}
                  {/if}
                </div>
                {#if r.commitment.note}
                  <div class="mt-1 text-xs text-gray-500">{r.commitment.note}</div>
                {/if}
              </div>
              <div class="flex gap-2">
                <button
                  type="button"
                  onclick={() => {
                    admitTarget = r;
                  }}
                  class="rounded border border-gray-300 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                >
                  Admit to pool
                </button>
                <button
                  type="button"
                  disabled={!canAct}
                  onclick={() => {
                    fulfillTarget = r;
                  }}
                  class="rounded bg-blue-600 px-2 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  Fulfill
                </button>
              </div>
            </div>
          </li>
        {/each}
      </ul>
    {/if}
  </section>

  <section>
    <h4 class="mb-2 text-sm font-semibold text-gray-800">Economic events</h4>
    {#if events.length === 0}
      <p class="text-sm text-gray-500">No events recorded for this NDO yet.</p>
    {:else}
      <ul class="space-y-2">
        {#each events as ev, i (i)}
          <li class="rounded border border-gray-200 bg-white p-3 text-sm">
            <div class="font-medium text-gray-900">{ev.action}</div>
            <div class="mt-1 text-gray-600">
              Qty {ev.resource_quantity.numerical_value}
              {ev.resource_quantity.has_unit} · {new Date(Number(ev.event_time) / 1000).toLocaleString()}
            </div>
            {#if ev.note}
              <div class="mt-1 text-xs text-gray-500">{ev.note}</div>
            {/if}
          </li>
        {/each}
      </ul>
    {/if}
  </section>

  <ParticipationClaimsPanel {ndoCellId} />
</div>
