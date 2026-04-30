<script lang="ts">
  interface Member {
    id: string;
    name: string;
    role?: string;
  }

  interface Props {
    members: Member[];
  }

  let { members }: Props = $props();
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
        <li class="flex items-center justify-between rounded border border-gray-200 bg-white px-3 py-2 text-sm">
          <span class="font-medium text-gray-800">{m.name}</span>
          {#if m.role}
            <span class="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">{m.role}</span>
          {/if}
        </li>
      {/each}
    </ul>
  {/if}
</section>
