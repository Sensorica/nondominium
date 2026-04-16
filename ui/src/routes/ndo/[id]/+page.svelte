<script lang="ts">
  import NdoView from '$lib/components/ndo/NdoView.svelte';

  let { data } = $props();
</script>

<NdoView specHashB64={data.specHashB64} />
