<script lang="ts">
  /**
   * Composition as an NdoHardLink list (no D3). Create requires a fulfillment
   * EconomicEvent hash backing the link (zome validation).
   */
  import type { ActionHash } from '@holochain/client';
  import { decodeHashFromBase64, encodeHashToBase64 } from '@holochain/client';
  import type { NdoLinkType } from '@nondominium/shared-types';
  import { NdoButton } from '@nondominium/ndo-ui';
  import { lobbyStore } from '$lib/stores/lobby.store.svelte';
  import {
    getNdoStore,
    isTaskInterrupted,
    type NdoHardLinkRecord
  } from '$lib/stores/ndo.store.svelte';

  interface Props {
    ndoIdentityHash: ActionHash;
  }

  let { ndoIdentityHash }: Props = $props();

  const ndo = getNdoStore();
  const LINK_TYPES: NdoLinkType[] = ['Component', 'DerivedFrom', 'Supersedes'];

  let links = $state<NdoHardLinkRecord[]>([]);
  let loadError = $state<string | null>(null);
  let isLoading = $state(false);
  let showCreate = $state(false);
  let toNdoHashB64 = $state('');
  let linkType = $state<NdoLinkType>('Component');
  let fulfillmentHashB64 = $state('');
  let createError = $state<string | null>(null);
  let creating = $state(false);

  async function load() {
    isLoading = true;
    loadError = null;
    try {
      links = await ndo().hardLinks();
    } catch (error) {
      if (isTaskInterrupted(error)) return;
      loadError = 'Could not load hard links.';
      links = [];
    } finally {
      isLoading = false;
    }
  }

  async function handleCreate() {
    createError = null;
    if (!toNdoHashB64.trim() || !fulfillmentHashB64.trim()) {
      createError = 'Target NDO hash and fulfillment event hash are required.';
      return;
    }
    creating = true;
    try {
      const toIdentity = decodeHashFromBase64(toNdoHashB64.trim()) as ActionHash;
      const fulfillment = decodeHashFromBase64(fulfillmentHashB64.trim()) as ActionHash;
      const result = await ndo().createHardLink({
        from_ndo_identity_hash: ndoIdentityHash,
        to_ndo_identity_hash: toIdentity,
        link_type: linkType,
        fulfillment_hash: fulfillment
      });
      if (!result.ok) {
        createError = result.cause;
        return;
      }
      showCreate = false;
      toNdoHashB64 = '';
      fulfillmentHashB64 = '';
      await load();
    } catch {
      createError = 'Invalid hash encoding.';
    } finally {
      creating = false;
    }
  }

  $effect(() => {
    void ndoIdentityHash;
    void load();
  });
</script>

<section class="space-y-4" data-testid="composition-tab">
  <div class="flex flex-wrap items-center justify-between gap-2">
    <div>
      <h3 class="text-sm font-semibold text-gray-900">Composition</h3>
      <p class="mt-0.5 text-xs text-gray-500">
        Hard links between NDOs (Component, DerivedFrom, Supersedes). Each link is backed by a
        fulfillment EconomicEvent.
      </p>
    </div>
    <NdoButton
      variant="primary"
      class="!px-3 !py-1.5 !text-xs"
      onclick={() => (showCreate = !showCreate)}
    >
      {showCreate ? 'Cancel' : 'Add hard link'}
    </NdoButton>
  </div>

  {#if showCreate}
    <div class="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-3">
      <label class="block text-xs font-medium text-gray-700">
        Target NDO identity hash (base64)
        <input
          class="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 font-mono text-xs"
          bind:value={toNdoHashB64}
          placeholder="uhCkk…"
        />
      </label>
      {#if lobbyStore.ndos.length > 0}
        <label class="block text-xs font-medium text-gray-700">
          Or pick from lobby NDOs
          <select
            class="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-xs"
            onchange={(e) => {
              const v = (e.currentTarget as HTMLSelectElement).value;
              if (v) toNdoHashB64 = v;
            }}
          >
            <option value="">—</option>
            {#each lobbyStore.ndos as d (d.hash)}
              <option value={d.hash}>{d.name}</option>
            {/each}
          </select>
        </label>
      {/if}
      <label class="block text-xs font-medium text-gray-700">
        Link type
        <select class="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-xs" bind:value={linkType}>
          {#each LINK_TYPES as t}
            <option value={t}>{t}</option>
          {/each}
        </select>
      </label>
      <label class="block text-xs font-medium text-gray-700">
        Fulfillment EconomicEvent hash (base64)
        <input
          class="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 font-mono text-xs"
          bind:value={fulfillmentHashB64}
          placeholder="uhCkk…"
        />
      </label>
      {#if createError}
        <p class="text-sm text-red-700" role="alert">{createError}</p>
      {/if}
      <NdoButton
        variant="primary"
        class="!px-3 !py-1.5 !text-xs"
        disabled={creating}
        onclick={() => void handleCreate()}
      >
        {creating ? 'Creating…' : 'Create link'}
      </NdoButton>
    </div>
  {/if}

  {#if isLoading}
    <p class="text-sm text-gray-500">Loading hard links…</p>
  {:else if loadError}
    <p class="text-sm text-red-700" role="alert">{loadError}</p>
  {:else if links.length === 0}
    <p class="text-sm text-gray-500">No hard links yet.</p>
  {:else}
    <ul class="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white">
      {#each links as link (encodeHashToBase64(link.action_hash))}
        <li class="px-4 py-3 text-sm">
          <p class="font-medium text-gray-900">{link.entry.link_type}</p>
          <p class="mt-1 font-mono text-xs text-gray-500 break-all">
            → {encodeHashToBase64(link.entry.to_ndo_identity_hash)}
          </p>
          <a
            class="mt-1 inline-block text-xs text-blue-700 hover:underline"
            href={`/ndo/${encodeURIComponent(encodeHashToBase64(link.entry.to_ndo_identity_hash))}`}
          >
            Open target NDO
          </a>
        </li>
      {/each}
    </ul>
  {/if}
</section>
