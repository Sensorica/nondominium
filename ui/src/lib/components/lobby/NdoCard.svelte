<script lang="ts">
  import type { NdoDescriptor } from '@nondominium/shared-types';

  interface Props {
    descriptor: NdoDescriptor;
  }

  let { descriptor }: Props = $props();

  const activeStages = new Set(['Active', 'Stable', 'Distributed', 'Development', 'Prototype']);

  const lifecycleClass = $derived(
    descriptor.lifecycle_stage && activeStages.has(descriptor.lifecycle_stage)
      ? 'bg-green-100 text-green-700'
      : 'bg-gray-100 text-gray-600'
  );

  const natureColorMap: Record<string, string> = {
    Physical: 'bg-blue-100 text-blue-700',
    Digital: 'bg-purple-100 text-purple-700',
    Service: 'bg-orange-100 text-orange-700',
    Hybrid: 'bg-teal-100 text-teal-700',
    Information: 'bg-indigo-100 text-indigo-700'
  };

  const natureClass = $derived(
    descriptor.resource_nature
      ? (natureColorMap[descriptor.resource_nature] ?? 'bg-gray-100 text-gray-600')
      : null
  );
</script>

<a
  href="/ndo/{encodeURIComponent(descriptor.hash)}"
  class="block rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
>
  <div class="mb-2 flex flex-wrap items-center gap-2">
    <span class={`rounded px-2 py-0.5 text-xs font-medium ${lifecycleClass}`}>
      {descriptor.lifecycle_stage ?? 'Unknown'}
    </span>
    {#if descriptor.property_regime}
      <span class="rounded border border-dashed border-gray-400 px-2 py-0.5 text-xs text-gray-700">
        {descriptor.property_regime}
      </span>
    {/if}
    {#if natureClass}
      <span class={`rounded px-2 py-0.5 text-xs font-medium ${natureClass}`}>
        {descriptor.resource_nature}
      </span>
    {/if}
  </div>
  <h3 class="text-lg font-semibold text-gray-900">{descriptor.name}</h3>
  {#if descriptor.description}
    <p class="mt-1 line-clamp-2 text-sm text-gray-600">{descriptor.description}</p>
  {/if}
  <p class="mt-1 font-mono text-xs text-gray-400">#{descriptor.hash.slice(0, 12)}…</p>
</a>
