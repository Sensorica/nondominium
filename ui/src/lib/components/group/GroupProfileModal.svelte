<script lang="ts">
  import type { GroupMemberProfile, LobbyUserProfile } from '@nondominium/shared-types';
  import { appContext } from '$lib/stores/app.context.svelte';

  interface Props {
    groupId: string;
    onclose: () => void;
    onsave: (profile: GroupMemberProfile) => void;
  }

  let { groupId, onclose, onsave }: Props = $props();

  const lobby = appContext.lobbyUserProfile;
  const optionalFields: (keyof Omit<LobbyUserProfile, 'nickname'>)[] = [
    'realName', 'bio', 'email', 'phone', 'address'
  ];
  const fieldLabels: Record<string, string> = {
    realName: 'Real name',
    bio: 'Bio',
    email: 'Email',
    phone: 'Phone',
    address: 'Address'
  };

  let isAnonymous = $state(false);
  let shownFields = $state<(keyof Omit<LobbyUserProfile, 'nickname'>)[]>([]);

  function toggleField(f: keyof Omit<LobbyUserProfile, 'nickname'>) {
    shownFields = shownFields.includes(f)
      ? shownFields.filter((x) => x !== f)
      : [...shownFields, f];
  }

  function save() {
    onsave({ isAnonymous, shownFields: isAnonymous ? [] : shownFields });
    onclose();
  }
</script>

<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
  <div
    class="relative w-full max-w-sm rounded-xl border border-gray-200 bg-white shadow-xl"
    role="dialog"
    aria-modal="true"
    aria-labelledby="group-profile-title"
  >
    <div class="border-b border-gray-100 px-6 py-4">
      <h2 id="group-profile-title" class="text-lg font-semibold text-gray-900">
        Group profile
      </h2>
      <p class="mt-1 text-sm text-gray-500">
        Choose how you appear to other members in this group.
      </p>
    </div>

    <div class="px-6 py-4 space-y-4">
      <label class="flex items-center gap-3 cursor-pointer">
        <input type="checkbox" bind:checked={isAnonymous} class="h-4 w-4 rounded" />
        <span class="text-sm text-gray-700">Appear anonymously (pseudonym only)</span>
      </label>

      {#if !isAnonymous && lobby}
        <div>
          <p class="mb-2 text-xs font-medium text-gray-500 uppercase tracking-wide">
            Also share from your Lobby profile:
          </p>
          <div class="space-y-1.5">
            {#each optionalFields as f}
              {#if (lobby as Record<string, unknown>)[f]}
                <label class="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={shownFields.includes(f)}
                    onchange={() => toggleField(f)}
                    class="h-4 w-4 rounded"
                  />
                  <span class="text-sm text-gray-700">
                    {fieldLabels[f]}: <span class="font-medium">{(lobby as Record<string, unknown>)[f]}</span>
                  </span>
                </label>
              {/if}
            {/each}
          </div>
        </div>
      {:else if !lobby}
        <p class="text-xs text-gray-400 italic">
          Set up a Lobby profile to share personal details.
        </p>
      {/if}
    </div>

    <div class="flex justify-end gap-2 border-t border-gray-100 px-6 py-4">
      <button
        type="button"
        onclick={onclose}
        class="rounded px-4 py-2 text-sm text-gray-600 hover:bg-gray-100"
      >
        Skip
      </button>
      <button
        type="button"
        onclick={save}
        class="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
      >
        Save
      </button>
    </div>
  </div>
</div>
