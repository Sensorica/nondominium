<script lang="ts">
  import { tick } from 'svelte';
  import { Dialog } from 'melt/builders';
  import type { LobbyUserProfile } from '@nondominium/shared-types';
  import { appContext } from '$lib/stores/app.context.svelte';
  import { lobbyStore } from '$lib/stores/lobby.store.svelte';
  import UserProfileForm from './UserProfileForm.svelte';

  interface Props {
    /** Whether the modal is open (controlled by the parent). */
    open: boolean;
    /** Called when the modal is dismissed without saving. */
    onclose?: () => void;
    /** Called with the saved profile. */
    onsave?: (profile: LobbyUserProfile) => void;
  }

  let { open = $bindable(), onclose, onsave }: Props = $props();

  // First-launch guard: closing (Escape, outside click, close button) is only
  // allowed once a nickname has been saved.
  const hasProfile = $derived(!!appContext.lobbyUserProfile?.nickname);

  const dialog = new Dialog({
    closeOnEscape: () => hasProfile,
    closeOnOutsideClick: () => hasProfile,
    onOpenChange: (value) => {
      open = value;
      if (!value) onclose?.();
    }
  });

  // Drive the native <dialog> from the controlled `open` prop.
  $effect(() => {
    dialog.open = open;
  });

  // Move focus to the nickname input when the dialog opens (REQ-UI-ID-01).
  $effect(() => {
    if (open) {
      void tick().then(() => {
        document.getElementById('lup-nickname')?.focus();
      });
    }
  });

  function handleSave(profile: LobbyUserProfile) {
    // Best-effort Lobby DHT sync; localStorage stays authoritative (D1 in #106).
    lobbyStore.syncLobbyAgentProfile(profile);
    onsave?.(profile);
    open = false;
  }
</script>

<!-- Native <dialog> carries an implicit role="dialog"; adding it explicitly is
     flagged as redundant by svelte-check. -->
<dialog
  {...dialog.content}
  aria-modal="true"
  aria-label={hasProfile ? 'Edit your Lobby profile' : 'Set up your Lobby profile'}
  class="w-full max-w-md rounded-xl border border-gray-200 bg-white p-0 shadow-xl"
>
  {#if open}
    <div class="px-6 py-6">
      <UserProfileForm
        mode="page"
        onsave={handleSave}
        onclose={hasProfile ? () => { open = false; } : undefined}
      />
    </div>
  {/if}
</dialog>

<style>
  dialog::backdrop {
    background-color: rgb(0 0 0 / 0.4);
    backdrop-filter: blur(2px);
  }
</style>
