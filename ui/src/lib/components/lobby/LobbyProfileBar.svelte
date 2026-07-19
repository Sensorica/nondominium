<script lang="ts">
  import { appContext } from '$lib/stores/app.context.svelte';

  interface Props {
    /** Open the profile setup / edit modal */
    onOpenProfile: () => void;
  }

  let { onOpenProfile }: Props = $props();

  const profile = $derived(appContext.lobbyUserProfile);
</script>

<div
  class="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-2"
>
  {#if profile}
    <span class="text-sm text-gray-700">
      Signed in as <span class="font-semibold text-gray-900">{profile.nickname}</span>
    </span>
    <button
      type="button"
      aria-label="Edit profile"
      onclick={() => onOpenProfile()}
      class="rounded px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50"
    >
      Edit
    </button>
  {:else}
    <span class="text-sm text-gray-500">No Lobby profile yet</span>
    <button
      type="button"
      aria-label="Open profile setup"
      onclick={() => onOpenProfile()}
      class="rounded bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700"
    >
      Set up your profile
    </button>
  {/if}
</div>
