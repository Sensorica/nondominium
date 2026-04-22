<script lang="ts">
  interface Props {
    softlinks: { id: string; label: string }[];
  }

  let { softlinks }: Props = $props();
</script>

<section class="mt-8">
  <h2 class="mb-2 text-lg font-semibold text-gray-800">Soft links</h2>
  {#if softlinks.length === 0}
    <p class="rounded border border-dashed border-gray-400 p-4 text-sm text-gray-500">
      No soft links (stub). Planning-only links use dashed borders per lobby conventions.
    </p>
  {:else}
    <ul class="space-y-2">
      {#each softlinks as s (s.id)}
        <li class="rounded border border-dashed border-gray-400 p-3 text-sm">{s.label}</li>
      {/each}
    </ul>
  {/if}
</section>
