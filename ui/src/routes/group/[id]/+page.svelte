<script lang="ts">
  import GroupView from '$lib/components/group/GroupView.svelte';
  import { page } from '$app/stores';

  let { data } = $props();

  const autoCreate = $derived($page.url.searchParams.get('createNdo') === '1');
</script>

<GroupView groupId={data.groupId} autoOpenCreateModal={autoCreate} />
