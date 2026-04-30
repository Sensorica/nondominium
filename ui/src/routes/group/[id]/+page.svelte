<script lang="ts">
  import GroupView from '$lib/components/group/GroupView.svelte';

  let { data } = $props();
</script>

<GroupView groupId={data.groupId} />
