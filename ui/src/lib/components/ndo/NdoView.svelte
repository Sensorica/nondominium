<script lang="ts">
  import type { ActionHash } from '@holochain/client';
  import { decodeHashFromBase64 } from '@holochain/client';
  import { Effect as E, Exit, pipe } from 'effect';
  import type { NdoDescriptor } from '@nondominium/shared-types';
  import { appContext } from '$lib/stores/app.context.svelte';
  import { NdoServiceTag, NdoServiceResolved } from '$lib/services/zomes/ndo.service';
  import ResourcesTab from './ResourcesTab.svelte';
  import GovernanceTab from './GovernanceTab.svelte';
  import ActivityTab from './ActivityTab.svelte';
  import CompositionTab from './CompositionTab.svelte';
  import NdoIdentityLayer from './NdoIdentityLayer.svelte';

  interface Props {
    specHashB64: string;
  }

  let { specHashB64 }: Props = $props();

  let specActionHash = $state<ActionHash | null>(null);
  let parseError = $state<string | null>(null);
  let tab = $state<'resources' | 'governance' | 'composition' | 'activity'>('resources');
  let ndoDescriptor = $state<NdoDescriptor | null>(null);

  $effect(() => {
    try {
      specActionHash = decodeHashFromBase64(decodeURIComponent(specHashB64)) as ActionHash;
      parseError = null;
      appContext.currentView = 'ndo';
      appContext.selectedNdoId = specActionHash;
    } catch {
      specActionHash = null;
      parseError = 'Could not decode resource specification hash from the URL.';
      appContext.selectedNdoId = null;
    }
  });

  $effect(() => {
    if (!specActionHash) return;
    const hash = specActionHash;
    void (async () => {
      const exit = await E.runPromiseExit(
        pipe(
          E.gen(function* () {
            const svc = yield* NdoServiceTag;
            return yield* svc.getNdoDescriptorForSpecActionHash(hash);
          }),
          E.provide(NdoServiceResolved)
        )
      );
      if (Exit.isSuccess(exit)) ndoDescriptor = exit.value;
    })();
  });

  const tabs = [
    { id: 'resources' as const, label: 'Resources' },
    { id: 'governance' as const, label: 'Governance' },
    { id: 'composition' as const, label: 'Composition' },
    { id: 'activity' as const, label: 'Activity' }
  ];
</script>

{#if parseError}
  <div class="p-6">
    <p class="text-red-600">{parseError}</p>
  </div>
{:else if specActionHash}
  <div class="border-b border-gray-200 bg-white px-6 pt-4">
    <h1 class="text-xl font-bold text-gray-900">{ndoDescriptor?.name ?? 'NDO'}</h1>
    <p class="mt-1 font-mono text-xs text-gray-500">{specHashB64}</p>
    <nav class="mt-4 flex gap-2" aria-label="NDO sections">
      {#each tabs as t}
        <button
          type="button"
          class="rounded-t border border-b-0 px-3 py-2 text-sm font-medium transition-colors {tab === t.id
            ? 'border-gray-200 bg-gray-50 text-gray-900'
            : 'border-transparent text-gray-500 hover:text-gray-800'}"
          onclick={() => {
            tab = t.id;
          }}
        >
          {t.label}
        </button>
      {/each}
    </nav>
  </div>

  <NdoIdentityLayer descriptor={ndoDescriptor} />

  <div class="p-6">
    {#if tab === 'resources'}
      <ResourcesTab specActionHash={specActionHash} />
    {:else if tab === 'governance'}
      <GovernanceTab specActionHash={specActionHash} />
    {:else if tab === 'composition'}
      <CompositionTab />
    {:else}
      <ActivityTab specActionHash={specActionHash} />
    {/if}
  </div>
{/if}
