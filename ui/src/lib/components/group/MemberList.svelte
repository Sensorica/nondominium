<script lang="ts">
  interface Props {
    members: { id: string; name: string }[];
  }

  let { members }: Props = $props();
</script>

<section class="mt-8">
  <h2 class="mb-2 text-lg font-semibold text-gray-800">Members</h2>
  {#if members.length === 0}
    <p class="rounded border border-dashed border-gray-400 p-4 text-sm text-gray-500">No members (stub).</p>
  {:else}
    <ul class="space-y-2">
      {#each members as m (m.id)}
        <li class="rounded border border-gray-200 bg-white p-3 text-sm">{m.name}</li>
      {/each}
    </ul>
  {/if}
</section>
