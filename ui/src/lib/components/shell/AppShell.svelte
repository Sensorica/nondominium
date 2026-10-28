<script lang="ts">
  import { afterNavigate } from '$app/navigation';
  import Sidebar from './Sidebar.svelte';

  interface Props {
    children?: import('svelte').Snippet;
  }

  let { children }: Props = $props();

  // Below md the sidebar is a drawer behind a top-bar menu button; any
  // navigation or Escape closes it. From md up it sits inline as before.
  let navOpen = $state(false);
  afterNavigate(() => {
    navOpen = false;
  });
  function onKeydown(e: KeyboardEvent) {
    if (navOpen && e.key === 'Escape') navOpen = false;
  }
</script>

<svelte:window onkeydown={onKeydown} />

<div class="flex min-h-screen bg-gray-100">
  <header
    class="fixed inset-x-0 top-0 z-30 flex h-12 items-center gap-2 border-b border-gray-200 bg-gray-50 px-3 md:hidden"
  >
    <button
      type="button"
      class="rounded p-2 text-gray-600 hover:bg-white hover:text-gray-900"
      aria-controls="app-sidebar"
      aria-expanded={navOpen}
      aria-label={navOpen ? 'Close menu' : 'Open menu'}
      onclick={() => (navOpen = !navOpen)}
    >
      <svg class="h-5 w-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true">
        {#if navOpen}
          <path d="M5 5l10 10M15 5L5 15" stroke-linecap="round" />
        {:else}
          <path d="M3 5h14M3 10h14M3 15h14" stroke-linecap="round" />
        {/if}
      </svg>
    </button>
    <span class="text-sm font-semibold text-gray-900">Nondominium</span>
  </header>

  {#if navOpen}
    <button
      type="button"
      class="fixed inset-0 z-30 bg-black/30 md:hidden"
      aria-label="Close menu"
      onclick={() => (navOpen = false)}
    ></button>
  {/if}

  <div
    id="app-sidebar"
    class="fixed inset-y-0 left-0 z-40 flex transition-transform duration-200 md:static md:z-auto md:translate-x-0 {navOpen
      ? 'translate-x-0'
      : '-translate-x-full'}"
  >
    <Sidebar />
  </div>

  <main class="min-w-0 flex-1 overflow-auto pt-12 md:pt-0">
    {@render children?.()}
  </main>
</div>
