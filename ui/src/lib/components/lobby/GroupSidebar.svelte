<script lang="ts">
  import type { GroupDescriptor } from '@nondominium/shared-types';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';

  interface Props {
    groups: GroupDescriptor[];
    oncreategroup?: (name: string) => Promise<void>;
    onjoingroup?: (inviteCode: string) => Promise<void>;
    oneditprofile?: () => void;
  }

  let { groups, oncreategroup, onjoingroup, oneditprofile }: Props = $props();

  let showCreateForm = $state(false);
  let showJoinForm = $state(false);
  let createName = $state('');
  let joinCode = $state('');
  let createError = $state('');
  let joinError = $state('');
  let isCreating = $state(false);
  let isJoining = $state(false);

  const isGroupActive = (id: string) => $page.url.pathname.startsWith(`/group/${id}`);

  async function handleCreate() {
    if (!createName.trim()) {
      createError = 'Group name is required.';
      return;
    }
    isCreating = true;
    createError = '';
    try {
      await oncreategroup?.(createName.trim());
      const created = groups[groups.length - 1];
      createName = '';
      showCreateForm = false;
      if (created) await goto(`/group/${created.id}`);
    } catch {
      createError = 'Failed to create group.';
    } finally {
      isCreating = false;
    }
  }

  async function handleJoin() {
    if (!joinCode.trim()) {
      joinError = 'Paste an invite link or code.';
      return;
    }
    isJoining = true;
    joinError = '';
    try {
      await onjoingroup?.(joinCode.trim());
      const joined = groups[groups.length - 1];
      joinCode = '';
      showJoinForm = false;
      if (joined) await goto(`/group/${joined.id}`);
    } catch {
      joinError = 'Invalid invite code.';
    } finally {
      isJoining = false;
    }
  }
</script>

<aside class="flex w-56 shrink-0 flex-col border-r border-gray-200 bg-white p-3">
  <div class="mb-2 flex items-center justify-between">
    <h2 class="text-sm font-semibold text-gray-800">Groups</h2>
  </div>

  {#if groups.length > 0}
    <ul class="mb-3 space-y-1">
      {#each groups as g (g.id)}
        <li>
          <a
            href="/group/{g.id}"
            class="block truncate rounded px-2 py-1 text-sm transition-colors {isGroupActive(g.id)
              ? 'bg-gray-100 font-medium text-gray-900'
              : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'}"
          >
            {g.name}
          </a>
        </li>
      {/each}
    </ul>
  {:else}
    <p class="mb-3 text-xs text-gray-400 italic">No groups yet.</p>
  {/if}

  <!-- Create Group -->
  {#if showCreateForm}
    <div class="mb-2 rounded border border-gray-200 bg-gray-50 p-2">
      <p class="mb-1.5 text-xs font-medium text-gray-700">Create group</p>
      <input
        type="text"
        bind:value={createName}
        placeholder="Group name"
        class="mb-1.5 w-full rounded border border-gray-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none"
        onkeydown={(e) => { if (e.key === 'Enter') handleCreate(); }}
      />
      {#if createError}
        <p class="mb-1 text-xs text-red-600">{createError}</p>
      {/if}
      <div class="flex gap-1">
        <button
          type="button"
          disabled={isCreating}
          onclick={handleCreate}
          class="rounded bg-blue-600 px-2 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {isCreating ? 'Creating…' : 'Create'}
        </button>
        <button
          type="button"
          onclick={() => { showCreateForm = false; createName = ''; createError = ''; }}
          class="rounded px-2 py-1 text-xs text-gray-500 hover:bg-gray-200"
        >
          Cancel
        </button>
      </div>
    </div>
  {:else}
    <button
      type="button"
      onclick={() => { showCreateForm = true; showJoinForm = false; }}
      class="mb-1 flex w-full items-center gap-1 rounded px-2 py-1.5 text-xs text-blue-600 hover:bg-blue-50"
    >
      <span class="font-bold">+</span> Create group
    </button>
  {/if}

  <!-- Join Group -->
  {#if showJoinForm}
    <div class="mb-2 rounded border border-gray-200 bg-gray-50 p-2">
      <p class="mb-1.5 text-xs font-medium text-gray-700">Join group</p>
      <input
        type="text"
        bind:value={joinCode}
        placeholder="Paste invite link"
        class="mb-1.5 w-full rounded border border-gray-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none"
        onkeydown={(e) => { if (e.key === 'Enter') handleJoin(); }}
      />
      {#if joinError}
        <p class="mb-1 text-xs text-red-600">{joinError}</p>
      {/if}
      <div class="flex gap-1">
        <button
          type="button"
          disabled={isJoining}
          onclick={handleJoin}
          class="rounded bg-blue-600 px-2 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {isJoining ? 'Joining…' : 'Join'}
        </button>
        <button
          type="button"
          onclick={() => { showJoinForm = false; joinCode = ''; joinError = ''; }}
          class="rounded px-2 py-1 text-xs text-gray-500 hover:bg-gray-200"
        >
          Cancel
        </button>
      </div>
    </div>
  {:else}
    <button
      type="button"
      onclick={() => { showJoinForm = true; showCreateForm = false; }}
      class="flex w-full items-center gap-1 rounded px-2 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
    >
      <span class="font-bold">→</span> Join group
    </button>
  {/if}

  <div class="mt-auto pt-4 border-t border-gray-100">
    <button
      type="button"
      onclick={() => oneditprofile?.()}
      class="w-full rounded px-2 py-1.5 text-left text-xs text-gray-500 hover:bg-gray-50 hover:text-gray-700"
    >
      My Profile
    </button>
  </div>
</aside>
