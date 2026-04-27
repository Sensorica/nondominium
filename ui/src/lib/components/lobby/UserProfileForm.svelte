<script lang="ts">
  import type { LobbyUserProfile } from '@nondominium/shared-types';
  import { appContext } from '$lib/stores/app.context.svelte';

  interface Props {
    mode?: 'modal' | 'page';
    onclose?: () => void;
    onsave?: (profile: LobbyUserProfile) => void;
  }

  let { mode = 'modal', onclose, onsave }: Props = $props();

  const existing = appContext.lobbyUserProfile;

  let nickname = $state(existing?.nickname ?? '');
  let realName = $state(existing?.realName ?? '');
  let bio = $state(existing?.bio ?? '');
  let email = $state(existing?.email ?? '');
  let phone = $state(existing?.phone ?? '');
  let address = $state(existing?.address ?? '');
  let nicknameError = $state('');

  function validate(): boolean {
    if (!nickname.trim()) {
      nicknameError = 'Nickname is required.';
      return false;
    }
    nicknameError = '';
    return true;
  }

  function save() {
    if (!validate()) return;
    const profile: LobbyUserProfile = {
      nickname: nickname.trim(),
      ...(realName.trim() && { realName: realName.trim() }),
      ...(bio.trim() && { bio: bio.trim() }),
      ...(email.trim() && { email: email.trim() }),
      ...(phone.trim() && { phone: phone.trim() }),
      ...(address.trim() && { address: address.trim() })
    };
    appContext.lobbyUserProfile = profile;
    onsave?.(profile);
    onclose?.();
  }
</script>

{#if mode === 'modal'}
  <!-- Modal backdrop -->
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
    <div
      class="relative w-full max-w-md rounded-xl border border-gray-200 bg-white shadow-xl"
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-form-title"
    >
      <div class="border-b border-gray-100 px-6 py-4">
        <h2 id="profile-form-title" class="text-lg font-semibold text-gray-900">
          {existing ? 'Edit profile' : 'Set up your Lobby profile'}
        </h2>
        <p class="mt-1 text-sm text-gray-500">
          Your Lobby profile is stored locally. Only your nickname is required.
        </p>
      </div>
      <div class="px-6 py-4">
        {@render formBody()}
      </div>
      <div class="flex justify-end gap-2 border-t border-gray-100 px-6 py-4">
        {#if existing}
          <button
            type="button"
            class="rounded px-4 py-2 text-sm text-gray-600 hover:bg-gray-100"
            onclick={() => onclose?.()}
          >
            Cancel
          </button>
        {/if}
        <button
          type="button"
          class="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          onclick={save}
        >
          Save
        </button>
      </div>
    </div>
  </div>
{:else}
  <div class="max-w-md space-y-4">
    <h2 class="text-lg font-semibold text-gray-900">Edit Lobby profile</h2>
    {@render formBody()}
    <div class="flex gap-2">
      <button
        type="button"
        class="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        onclick={save}
      >
        Save
      </button>
      {#if onclose}
        <button
          type="button"
          class="rounded px-4 py-2 text-sm text-gray-600 hover:bg-gray-100"
          onclick={() => onclose?.()}
        >
          Cancel
        </button>
      {/if}
    </div>
  </div>
{/if}

{#snippet formBody()}
  <div class="space-y-3">
    <div>
      <label class="mb-1 block text-sm font-medium text-gray-700" for="lup-nickname">
        Nickname <span class="text-red-500">*</span>
      </label>
      <input
        id="lup-nickname"
        type="text"
        bind:value={nickname}
        placeholder="How you appear in the Lobby"
        class="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        oninput={() => { if (nicknameError) validate(); }}
      />
      {#if nicknameError}
        <p class="mt-1 text-xs text-red-600">{nicknameError}</p>
      {/if}
    </div>

    <p class="text-xs text-gray-400 uppercase tracking-wide font-medium">Optional fields</p>

    <div>
      <label class="mb-1 block text-sm text-gray-600" for="lup-realname">Real name</label>
      <input
        id="lup-realname"
        type="text"
        bind:value={realName}
        placeholder="Your full name (optional)"
        class="w-full rounded border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
      />
    </div>

    <div>
      <label class="mb-1 block text-sm text-gray-600" for="lup-bio">Bio</label>
      <textarea
        id="lup-bio"
        bind:value={bio}
        placeholder="Short bio (optional)"
        rows="2"
        class="w-full rounded border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
      ></textarea>
    </div>

    <div>
      <label class="mb-1 block text-sm text-gray-600" for="lup-email">Email</label>
      <input
        id="lup-email"
        type="email"
        bind:value={email}
        placeholder="email@example.com (optional)"
        class="w-full rounded border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
      />
    </div>

    <div>
      <label class="mb-1 block text-sm text-gray-600" for="lup-phone">Phone</label>
      <input
        id="lup-phone"
        type="tel"
        bind:value={phone}
        placeholder="+1 555 000 0000 (optional)"
        class="w-full rounded border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
      />
    </div>

    <div>
      <label class="mb-1 block text-sm text-gray-600" for="lup-address">Address</label>
      <input
        id="lup-address"
        type="text"
        bind:value={address}
        placeholder="Location (optional)"
        class="w-full rounded border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
      />
    </div>
  </div>
{/snippet}
