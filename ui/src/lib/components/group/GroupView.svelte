<script lang="ts">
  import { onMount } from 'svelte';
  import { Effect as E, Exit, pipe } from 'effect';
  import { GroupServiceTag, GroupServiceResolved } from '$lib/services/zomes/group.service';
  import { appContext } from '$lib/stores/app.context.svelte';
  import MemberList from './MemberList.svelte';
  import WorkLogFeed from './WorkLogFeed.svelte';
  import SoftLinkList from './SoftLinkList.svelte';

  interface Props {
    groupId: string;
  }

  let { groupId }: Props = $props();

  $effect(() => {
    appContext.currentView = 'group';
    appContext.selectedGroupId = groupId;
  });

  let members = $state<{ id: string; name: string }[]>([]);
  let worklogs = $state<{ id: string; title: string }[]>([]);
  let softlinks = $state<{ id: string; label: string }[]>([]);

  onMount(() => {
    void (async () => {
      const program = E.gen(function* () {
        const g = yield* GroupServiceTag;
        const [m, w, s] = yield* E.all(
          [g.getMembers(groupId), g.getWorkLogs(groupId), g.getSoftLinks(groupId)],
          { concurrency: 'unbounded' }
        );
        return { m, w, s };
      });
      const exit = await E.runPromiseExit(pipe(program, E.provide(GroupServiceResolved)));
      if (Exit.isSuccess(exit)) {
        members = exit.value.m;
        worklogs = exit.value.w;
        softlinks = exit.value.s;
      }
    })();
  });
</script>

<div class="p-6">
  <span class="mb-2 inline-block rounded bg-amber-50 px-2 py-0.5 text-xs text-amber-600">Coming soon</span>
  <h1 class="text-2xl font-bold text-gray-900">Group</h1>
  <p class="mt-1 font-mono text-sm text-gray-500">{groupId}</p>

  <MemberList {members} />
  <WorkLogFeed {worklogs} />
  <SoftLinkList {softlinks} />
</div>
