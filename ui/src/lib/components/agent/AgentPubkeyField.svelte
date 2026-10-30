<script lang="ts">
  /**
   * Provider/receiver field: pick a group or NDO member by nickname,
   * store the full AgentPubKey (b64) under the hood. Manual paste still allowed.
   */
  import {
    copyPubkey,
    truncatePubkey,
    type AgentMemberOption
  } from '$lib/utils/agent-pubkey';

  interface Props {
    id: string;
    label: string;
    value?: string;
    members?: AgentMemberOption[];
    /** Hint under the field (e.g. "NDO + group members"). */
    hint?: string;
  }

  let {
    id,
    label,
    value = $bindable(''),
    members = [],
    hint
  }: Props = $props();

  let copied = $state(false);
  let showPaste = $state(false);

  const matched = $derived(members.find((m) => m.id === value) ?? null);
  const selectValue = $derived(matched ? matched.id : '');

  function onPick(e: Event) {
    const next = (e.currentTarget as HTMLSelectElement).value;
    if (next) value = next;
  }

  async function onCopy() {
    if (!value) return;
    const ok = await copyPubkey(value);
    if (ok) {
      copied = true;
      setTimeout(() => {
        copied = false;
      }, 1500);
    }
  }
</script>

<div class="space-y-1.5">
  <label class="block text-sm font-medium text-gray-700" for="{id}-pick">{label}</label>

  {#if members.length > 0}
    <select
      id="{id}-pick"
      class="w-full rounded border border-gray-300 px-3 py-2 text-sm"
      value={selectValue}
      onchange={onPick}
    >
      <option value="">— pick a member —</option>
      {#each members as m (m.id)}
        <option value={m.id}>
          {m.name} · {truncatePubkey(m.id, 10, 4)}{m.role ? ` (${m.role})` : ''}
        </option>
      {/each}
    </select>
  {/if}

  {#if value}
    <div class="flex items-center gap-2 rounded border border-gray-100 bg-gray-50 px-2.5 py-1.5">
      <div class="min-w-0 flex-1">
        {#if matched}
          <p class="truncate text-sm font-medium text-gray-800">{matched.name}</p>
        {/if}
        <p class="font-mono text-xs text-gray-500" title={value}>
          {truncatePubkey(value)}
        </p>
      </div>
      <button
        type="button"
        onclick={() => void onCopy()}
        class="shrink-0 rounded border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700 hover:bg-gray-100"
      >
        {copied ? 'Copied' : 'Copy full key'}
      </button>
    </div>
  {/if}

  <div>
    <button
      type="button"
      class="text-xs text-blue-700 hover:underline"
      onclick={() => (showPaste = !showPaste)}
    >
      {showPaste ? 'Hide paste field' : members.length > 0 ? 'Or paste pubkey…' : 'Paste pubkey…'}
    </button>
    {#if showPaste || members.length === 0}
      <input
        {id}
        type="text"
        bind:value
        placeholder="uhCAk… (full agent pubkey, base64)"
        class="mt-1 w-full rounded border border-gray-300 px-3 py-2 font-mono text-xs"
        autocomplete="off"
        spellcheck="false"
      />
    {/if}
  </div>

  {#if hint}
    <p class="text-xs text-gray-400">{hint}</p>
  {/if}
</div>
