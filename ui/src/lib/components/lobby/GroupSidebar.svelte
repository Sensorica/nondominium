<script lang="ts">
  import type { GroupDescriptor } from '@nondominium/shared-types';

  interface Props {
    groups: GroupDescriptor[];
  }

  let { groups }: Props = $props();
</script>

<aside class="w-56 shrink-0 border-r border-gray-200 bg-white p-3">
  <div class="mb-2 flex items-center gap-2">
    <h2 class="text-sm font-semibold text-gray-800">Groups</h2>
    <span class="rounded bg-amber-50 px-1.5 py-0.5 text-xs text-amber-600">Coming soon</span>
  </div>
  <ul class="space-y-1">
    {#each groups as g (g.id)}
      <li>
        <a
          href="/group/{g.id}"
          class="block rounded px-2 py-1 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900"
        >
          {g.name}
        </a>
      </li>
    {/each}
  </ul>
</aside>
