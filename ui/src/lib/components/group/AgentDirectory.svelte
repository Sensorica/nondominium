<script lang="ts">
  /**
   * hApp-local Agent Perspective directory (no mock fixtures).
   * Mirrors design-system AgentPerspective layout over DHT members.
   */
  import type { GroupDescriptor } from '@nondominium/shared-types';
  import { NdoButton, ComingNextPopup } from '@nondominium/ndo-ui';
  import { copyPubkey, truncatePubkey } from '$lib/utils/agent-pubkey';

  export interface AgentDirectoryPerson {
    id: string;
    name: string;
    bio?: string;
    skills?: string[];
  }

  interface Props {
    groupId: string;
    groupName?: string;
    people: AgentDirectoryPerson[];
    groups?: GroupDescriptor[];
    onselectagent?: (agentId: string) => void;
    onselectgroup?: (groupId: string) => void;
    onresources?: (groupId: string) => void;
  }

  let {
    groupId,
    groupName,
    people,
    groups = [],
    onselectagent,
    onselectgroup,
    onresources
  }: Props = $props();

  let skill = $state<string | null>(null);
  let soonId = $state<string | null>(null);
  let copiedId = $state<string | null>(null);

  async function onCopy(id: string, e: MouseEvent) {
    e.stopPropagation();
    e.preventDefault();
    const ok = await copyPubkey(id);
    if (ok) {
      copiedId = id;
      setTimeout(() => {
        if (copiedId === id) copiedId = null;
      }, 1500);
    }
  }

  const skills = $derived(
    Array.from(new Set(people.flatMap((p) => p.skills ?? []))).sort()
  );
  const filtered = $derived(
    skill ? people.filter((p) => (p.skills ?? []).includes(skill!)) : people
  );
</script>

{#if soonId}
  <ComingNextPopup featureId={soonId} onclose={() => (soonId = null)} />
{/if}

<div data-testid="agent-perspective" class="space-y-6">
  <div>
    <h2 class="text-lg font-semibold text-gray-900">Who is here</h2>
    <p class="mt-1 text-sm text-gray-500">
      Agents in {groupName ?? 'this group'}. Declared interests narrow the list when available; they
      are not validated roles.
    </p>
  </div>

  {#if skills.length > 0}
    <div>
      <p class="text-xs font-medium text-gray-700">Declared interests</p>
      <div class="mt-2 flex flex-wrap gap-1.5">
        <button
          type="button"
          data-testid="agent-skill-chip"
          class="rounded-full border px-2.5 py-0.5 text-xs {skill === null
            ? 'border-blue-500 bg-blue-50 text-blue-800'
            : 'border-gray-200 text-gray-600 hover:bg-gray-50'}"
          onclick={() => (skill = null)}
        >
          All
        </button>
        {#each skills as s}
          <button
            type="button"
            data-testid="agent-skill-chip"
            class="rounded-full border px-2.5 py-0.5 text-xs {skill === s
              ? 'border-blue-500 bg-blue-50 text-blue-800'
              : 'border-gray-200 text-gray-600 hover:bg-gray-50'}"
            onclick={() => (skill = skill === s ? null : s)}
          >
            {s}
          </button>
        {/each}
      </div>
    </div>
  {/if}

  <ul class="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white">
    {#each filtered as person (person.id)}
      <li class="flex items-start gap-2 px-4 py-3 hover:bg-gray-50">
        <button
          type="button"
          class="flex min-w-0 flex-1 items-start gap-3 text-left"
          data-testid="agent-card"
          data-agent={person.id}
          onclick={() => onselectagent?.(person.id)}
        >
          <span
            class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-800"
            aria-hidden="true"
          >
            {person.name.slice(0, 1).toUpperCase()}
          </span>
          <span class="min-w-0 flex-1">
            <span class="block text-sm font-medium text-gray-900">{person.name}</span>
            <span class="mt-0.5 block font-mono text-[11px] text-gray-400" title={person.id}
              >{truncatePubkey(person.id)}</span
            >
            {#if person.bio}
              <span class="mt-0.5 block text-xs text-gray-500">{person.bio}</span>
            {/if}
            {#if (person.skills ?? []).length > 0}
              <span class="mt-1 flex flex-wrap gap-1">
                {#each person.skills ?? [] as s}
                  <span class="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-600">{s}</span>
                {/each}
              </span>
            {/if}
          </span>
        </button>
        <button
          type="button"
          class="mt-1 shrink-0 rounded border border-gray-200 px-2 py-0.5 text-xs text-gray-600 hover:bg-white"
          title="Copy full agent pubkey"
          onclick={(e) => void onCopy(person.id, e)}
        >
          {copiedId === person.id ? 'Copied' : 'Copy key'}
        </button>
      </li>
    {:else}
      <li class="px-4 py-6 text-center text-sm text-gray-500">
        {people.length === 0 ? 'No members in this group yet.' : 'No agents match this interest.'}
      </li>
    {/each}
  </ul>

  {#if groups.length > 1}
    <div>
      <h3 class="text-sm font-semibold text-gray-800">Other groups</h3>
      <ul class="mt-2 space-y-1">
        {#each groups.filter((g) => g.id !== groupId) as g (g.id)}
          <li class="flex items-center justify-between gap-2 rounded border border-gray-100 px-3 py-2">
            <button
              type="button"
              class="text-sm font-medium text-blue-700 hover:underline"
              onclick={() => onselectgroup?.(g.id)}
            >
              {g.name}
            </button>
            <NdoButton variant="ghost" class="text-xs" onclick={() => onresources?.(g.id)}>
              Resources
            </NdoButton>
          </li>
        {/each}
      </ul>
    </div>
  {/if}

  <div class="flex flex-wrap gap-2">
    <NdoButton variant="ghost" onclick={() => (soonId = 'perspective-agent')}>
      Collaborate (Soon)
    </NdoButton>
  </div>
</div>
