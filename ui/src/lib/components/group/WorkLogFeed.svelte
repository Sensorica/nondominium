<script lang="ts">
  interface Props {
    worklogs: { id: string; title: string }[];
  }

  let { worklogs }: Props = $props();
</script>

<section class="mt-8">
  <h2 class="mb-2 text-lg font-semibold text-gray-800">Work log</h2>
  {#if worklogs.length === 0}
    <p class="rounded border border-dashed border-gray-400 p-4 text-sm text-gray-500">No work log entries (stub).</p>
  {:else}
    <ul class="space-y-2">
      {#each worklogs as w (w.id)}
        <li class="rounded border border-gray-200 bg-white p-3 text-sm">{w.title}</li>
      {/each}
    </ul>
  {/if}
</section>
