<script lang="ts">
  /**
   * hApp-local Agent profile (no mock fixtures).
   * Shows Person when present, group memberships, initiated/joined NDOs,
   * derived connections, and self-only PPRs.
   */
  import type { GroupDescriptor, NdoDescriptor, PrivateParticipationClaim } from '@nondominium/shared-types';
  import { NdoButton, ComingNextPopup, SoonBadge } from '@nondominium/ndo-ui';
  import type { NavTrailEntry } from '$lib/stores/nav-trail.svelte';
  import { copyPubkey, truncatePubkey } from '$lib/utils/agent-pubkey';

  export interface AgentConnection {
    agentId: string;
    name: string;
    reasons: Array<'same_group' | 'same_resource'>;
  }

  interface Props {
    agentId: string;
    agentName: string;
    bio?: string | null;
    roleInGroup?: string | null;
    theirGroups: GroupDescriptor[];
    initiated: NdoDescriptor[];
    joined: NdoDescriptor[];
    connections: AgentConnection[];
    isSelf?: boolean;
    claims?: Array<{ claim: PrivateParticipationClaim }>;
    trailTop?: NavTrailEntry | null;
    onselectndo?: (hash: string) => void;
    onselectagent?: (agentId: string) => void;
    onselectgroup?: (groupId: string) => void;
    onback?: () => void;
  }

  let {
    agentId,
    agentName,
    bio = null,
    roleInGroup = null,
    theirGroups,
    initiated,
    joined,
    connections,
    isSelf = false,
    claims = [],
    trailTop = null,
    onselectndo,
    onselectagent,
    onselectgroup,
    onback
  }: Props = $props();

  let soonId = $state<string | null>(null);
  let copied = $state(false);

  const REASON_LABEL: Record<AgentConnection['reasons'][number], string> = {
    same_group: 'same group',
    same_resource: 'same resource'
  };

  async function onCopyKey() {
    const ok = await copyPubkey(agentId);
    if (ok) {
      copied = true;
      setTimeout(() => {
        copied = false;
      }, 1500);
    }
  }
</script>

{#if soonId}
  <ComingNextPopup featureId={soonId} onclose={() => (soonId = null)} />
{/if}

<div data-testid="agent-profile" class="space-y-6">
  {#if trailTop || onback}
    <button type="button" class="text-sm text-blue-700 hover:underline" onclick={() => onback?.()}>
      ← Back{trailTop ? ` to ${trailTop.label}` : ''}
    </button>
  {/if}

  <header class="flex items-start gap-3">
    <span
      class="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-100 text-lg font-semibold text-blue-800"
      aria-hidden="true"
    >
      {agentName.slice(0, 1).toUpperCase()}
    </span>
    <div class="min-w-0 flex-1">
      <h2 class="text-xl font-bold text-gray-900">{agentName}</h2>
      <div class="mt-1 flex flex-wrap items-center gap-2">
        <p class="font-mono text-xs text-gray-400" title={agentId}>{truncatePubkey(agentId)}</p>
        <button
          type="button"
          class="rounded border border-gray-200 px-2 py-0.5 text-xs text-gray-600 hover:bg-gray-50"
          onclick={() => void onCopyKey()}
        >
          {copied ? 'Copied' : 'Copy full key'}
        </button>
      </div>
      {#if roleInGroup}
        <p class="mt-1 text-xs text-gray-600">In this group: {roleInGroup}</p>
      {/if}
      {#if bio}
        <p class="mt-2 text-sm text-gray-700">{bio}</p>
      {/if}
    </div>
  </header>

  <section>
    <h3 class="text-sm font-semibold text-gray-800">Groups</h3>
    {#if theirGroups.length === 0}
      <p class="mt-2 text-sm text-gray-500">No shared groups visible.</p>
    {:else}
      <ul class="mt-2 space-y-1">
        {#each theirGroups as g (g.id)}
          <li>
            <button
              type="button"
              class="text-sm text-blue-700 hover:underline"
              onclick={() => onselectgroup?.(g.id)}
            >
              {g.name}
            </button>
          </li>
        {/each}
      </ul>
    {/if}
  </section>

  <section>
    <h3 class="text-sm font-semibold text-gray-800">NDOs initiated</h3>
    {#if initiated.length === 0}
      <p class="mt-2 text-sm text-gray-500">None in your network yet.</p>
    {:else}
      <ul class="mt-2 space-y-1">
        {#each initiated as d (d.hash)}
          <li>
            <button
              type="button"
              class="text-sm text-blue-700 hover:underline"
              onclick={() => onselectndo?.(d.hash)}
            >
              {d.name}
            </button>
            {#if d.lifecycle_stage}
              <span class="ml-2 text-xs text-gray-400">{d.lifecycle_stage}</span>
            {/if}
          </li>
        {/each}
      </ul>
    {/if}
  </section>

  <section>
    <h3 class="text-sm font-semibold text-gray-800">NDOs joined</h3>
    {#if joined.length === 0}
      <p class="mt-2 text-sm text-gray-500">None visible from membership lists.</p>
    {:else}
      <ul class="mt-2 space-y-1">
        {#each joined as d (d.hash)}
          <li>
            <button
              type="button"
              class="text-sm text-blue-700 hover:underline"
              onclick={() => onselectndo?.(d.hash)}
            >
              {d.name}
            </button>
          </li>
        {/each}
      </ul>
    {/if}
  </section>

  <section>
    <h3 class="text-sm font-semibold text-gray-800">Connections</h3>
    {#if connections.length === 0}
      <p class="mt-2 text-sm text-gray-500">No derived connections yet.</p>
    {:else}
      <ul class="mt-2 divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white">
        {#each connections as c (c.agentId)}
          <li>
            <button
              type="button"
              class="flex w-full items-center justify-between gap-2 px-3 py-2 text-left hover:bg-gray-50"
              onclick={() => onselectagent?.(c.agentId)}
            >
              <span class="text-sm font-medium text-gray-900">{c.name}</span>
              <span class="text-xs text-gray-500">
                {c.reasons.map((r) => REASON_LABEL[r]).join(' · ')}
              </span>
            </button>
          </li>
        {/each}
      </ul>
    {/if}
  </section>

  {#if isSelf}
    <section>
      <h3 class="text-sm font-semibold text-gray-800">Your participation receipts</h3>
      {#if claims.length === 0}
        <p class="mt-2 text-sm text-gray-500">
          No private receipts yet. Fulfill a commitment to earn one.
        </p>
      {:else}
        <ul class="mt-2 space-y-1 text-sm text-gray-700">
          {#each claims.slice(0, 12) as row}
            <li class="rounded border border-gray-100 px-3 py-2">
              {row.claim.claim_type}
              <span class="ml-2 text-xs text-gray-400">
                {new Date(Number(row.claim.claimed_at) / 1000).toLocaleString()}
              </span>
            </li>
          {/each}
        </ul>
      {/if}
    </section>
  {:else}
    <section class="rounded border border-dashed border-gray-300 p-3 text-sm text-gray-500">
      Reputation summaries for other agents
      <SoonBadge />
      <button
        type="button"
        class="ml-2 text-blue-600 hover:underline"
        onclick={() => (soonId = 'perspective-agent')}
      >
        Why?
      </button>
    </section>
  {/if}

  <div class="flex flex-wrap gap-2">
    <NdoButton variant="ghost" onclick={() => (soonId = 'perspective-agent')}>
      Ask to collaborate (Soon)
    </NdoButton>
  </div>
</div>
