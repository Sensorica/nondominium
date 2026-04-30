<script lang="ts">
  import '../app.css';
  import 'virtual:uno.css';
  import favicon from '$lib/assets/favicon.svg';
  import HolochainProvider from '$lib/components/HolochainProvider.svelte';
  import AppShell from '$lib/components/shell/AppShell.svelte';

  let { children } = $props();
</script>

<svelte:head>
  <link rel="icon" href={favicon} />
  <title>Nondominium - ValueFlows Resource Sharing</title>
</svelte:head>

<HolochainProvider autoConnect={true}>
  <AppShell>
    {@render children()}
  </AppShell>
</HolochainProvider>
