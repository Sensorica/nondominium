<script lang="ts">
  import { copyPubkey, truncatePubkey } from '$lib/utils/agent-pubkey';

  interface Member {
    id: string;
    name: string;
    role?: string;
  }

  interface Props {
    members: Member[];
    onmemberclick?: (member: Member) => void;
  }

  let { members, onmemberclick }: Props = $props();

  let copiedId = $state<string | null>(null);

  async function onCopy(id: string, e: MouseEvent) {
    e.stopPropagation();
    const ok = await copyPubkey(id);
    if (ok) {
      copiedId = id;
      setTimeout(() => {
        if (copiedId === id) copiedId = null;
      }, 1500);
    }
  }
</script>

<section class="mt-8">
  <h2 class="mb-2 text-lg font-semibold text-gray-800">Members</h2>
  {#if members.length === 0}
    <p class="rounded border border-dashed border-gray-300 p-4 text-sm text-gray-400 italic">
      No members yet.
    </p>
  {:else}
    <ul class="space-y-2">
      {#each members as m (m.id)}
        <li
          data-testid="member-row"
          class="flex items-center justify-between gap-2 rounded border border-gray-200 bg-white px-3 py-2 text-sm"
        >
          <div class="min-w-0 flex-1">
            {#if onmemberclick}
              <button
                type="button"
                class="font-medium text-blue-700 hover:underline"
                onclick={() => onmemberclick?.(m)}
              >
                {m.name}
              </button>
            {:else}
              <span class="font-medium text-gray-800">{m.name}</span>
            {/if}
            <p class="mt-0.5 font-mono text-xs text-gray-400" title={m.id}>
              {truncatePubkey(m.id)}
            </p>
          </div>
          <div class="flex shrink-0 items-center gap-2">
            {#if m.role}
              <span class="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">{m.role}</span>
            {/if}
            <button
              type="button"
              class="rounded border border-gray-200 px-2 py-0.5 text-xs text-gray-600 hover:bg-gray-50"
              title="Copy full agent pubkey"
              onclick={(e) => void onCopy(m.id, e)}
            >
              {copiedId === m.id ? 'Copied' : 'Copy key'}
            </button>
          </div>
        </li>
      {/each}
    </ul>
  {/if}
</section>
