<script lang="ts">
  import Sidebar from './Sidebar.svelte';

  interface Props {
    children?: import('svelte').Snippet;
  }

  let { children }: Props = $props();
</script>

<div class="flex min-h-screen bg-gray-100">
  <Sidebar />
  <main class="min-w-0 flex-1 overflow-auto">
    {@render children?.()}
  </main>
</div>
