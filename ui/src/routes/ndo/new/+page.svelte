<script lang="ts">
  import { appContext } from '$lib/stores/app.context.svelte';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';

  onMount(() => {
    if (appContext.selectedGroupId) {
      void goto(`/group/${appContext.selectedGroupId}?createNdo=1`);
    }
  });
</script>

<div class="p-6 max-w-lg">
  <h1 class="text-2xl font-bold text-gray-900">New NDO</h1>
  <p class="mt-2 text-sm text-gray-600">
    NDOs are created from within a <strong>Group</strong>. Groups are the organizational context
    for NDO creation in Nondominium.
  </p>

  <div class="mt-6 rounded-lg border border-dashed border-gray-300 bg-gray-50 px-6 py-8 text-center">
    <p class="text-sm text-gray-500">
      Please create or join a Group from the Lobby first, then use the
      <span class="font-medium text-blue-600">+ Create NDO</span> button inside the group.
    </p>
    <a
      href="/"
      class="mt-4 inline-block rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
    >
      Go to Lobby
    </a>
  </div>
</div>
