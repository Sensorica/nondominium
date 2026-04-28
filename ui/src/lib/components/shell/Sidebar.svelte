<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { lobbyStore } from '$lib/stores/lobby.store.svelte';
  import { appContext } from '$lib/stores/app.context.svelte';
  import UserProfileForm from '$lib/components/lobby/UserProfileForm.svelte';

  const isActive = (href: string) =>
    href === '/' ? $page.url.pathname === '/' : $page.url.pathname.startsWith(href);

  let showCreateForm = $state(false);
  let showJoinForm = $state(false);
  let createName = $state('');
  let joinCode = $state('');
  let createError = $state('');
  let joinError = $state('');
  let isCreating = $state(false);
  let isJoining = $state(false);
  let showProfileModal = $state(false);

  async function handleCreate() {
    if (!createName.trim()) { createError = 'Group name is required.'; return; }
    isCreating = true;
    createError = '';
    try {
      const group = await lobbyStore.createGroup(createName.trim(), appContext.lobbyUserProfile?.nickname);
      createName = '';
      showCreateForm = false;
      if (group) await goto(`/group/${group.id}`);
    } catch {
      createError = 'Failed to create group.';
    } finally {
      isCreating = false;
    }
  }

  async function handleJoin() {
    if (!joinCode.trim()) { joinError = 'Paste an invite link or code.'; return; }
    isJoining = true;
    joinError = '';
    try {
      const group = await lobbyStore.joinGroup(joinCode.trim());
      joinCode = '';
      showJoinForm = false;
      if (group) await goto(`/group/${group.id}`);
    } catch {
      joinError = 'Invalid invite code.';
    } finally {
      isJoining = false;
    }
  }
</script>

{#if showProfileModal}
  <UserProfileForm
    mode="modal"
    onclose={() => { showProfileModal = false; }}
    onsave={() => { showProfileModal = false; }}
  />
{/if}

<nav
  class="flex w-52 shrink-0 flex-col border-r border-gray-200 bg-gray-50 p-3"
  aria-label="Primary"
>
  <!-- Browse NDOs -->
  <a
    href="/"
    class="mb-3 block rounded px-2 py-1.5 text-sm font-medium transition-colors {isActive('/')
      ? 'bg-white text-gray-900 shadow-sm'
      : 'text-gray-600 hover:bg-white hover:text-gray-900'}"
  >
    Browse NDOs
  </a>

  <div class="mb-1 text-xs font-semibold tracking-wide text-gray-400 uppercase">Groups</div>

  <!-- Group list -->
  {#if lobbyStore.groups.length > 0}
    <ul class="mb-2 space-y-0.5">
      {#each lobbyStore.groups as g (g.id)}
        <li>
          <a
            href="/group/{g.id}"
            class="block truncate rounded px-2 py-1 text-sm transition-colors {isActive(`/group/${g.id}`)
              ? 'bg-white font-medium text-gray-900 shadow-sm'
              : 'text-gray-700 hover:bg-white hover:text-gray-900'}"
          >
            {g.name}
          </a>
        </li>
      {/each}
    </ul>
  {:else}
    <p class="mb-2 text-xs text-gray-400 italic">No groups yet.</p>
  {/if}

  <!-- Create Group -->
  {#if showCreateForm}
    <div class="mb-2 rounded border border-gray-200 bg-white p-2">
      <p class="mb-1.5 text-xs font-medium text-gray-700">New group</p>
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
          class="rounded px-2 py-1 text-xs text-gray-500 hover:bg-gray-100"
        >
          Cancel
        </button>
      </div>
    </div>
  {:else}
    <button
      type="button"
      onclick={() => { showCreateForm = true; showJoinForm = false; }}
      class="mb-1 flex w-full items-center gap-1 rounded px-2 py-1.5 text-xs text-blue-600 hover:bg-white"
    >
      <span class="font-bold">+</span> New Group
    </button>
  {/if}

  <!-- Join Group -->
  {#if showJoinForm}
    <div class="mb-2 rounded border border-gray-200 bg-white p-2">
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
          class="rounded px-2 py-1 text-xs text-gray-500 hover:bg-gray-100"
        >
          Cancel
        </button>
      </div>
    </div>
  {:else}
    <button
      type="button"
      onclick={() => { showJoinForm = true; showCreateForm = false; }}
      class="flex w-full items-center gap-1 rounded px-2 py-1.5 text-xs text-gray-600 hover:bg-white"
    >
      <span class="font-bold">→</span> Join Group
    </button>
  {/if}

  <!-- My Profile -->
  <div class="mt-auto border-t border-gray-200 pt-3">
    <button
      type="button"
      onclick={() => { showProfileModal = true; }}
      class="w-full rounded px-2 py-1.5 text-left text-xs text-gray-500 hover:bg-white hover:text-gray-700"
    >
      {#if appContext.lobbyUserProfile?.nickname}
        <span class="font-medium text-gray-700">{appContext.lobbyUserProfile.nickname}</span>
        <span class="ml-1 text-gray-400">· Edit profile</span>
      {:else}
        Set up profile
      {/if}
    </button>
  </div>
</nav>
