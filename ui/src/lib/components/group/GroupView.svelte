<script lang="ts">
  import { onMount } from 'svelte';
  import { Effect as E, Exit, pipe } from 'effect';
  import { GroupServiceTag, GroupServiceResolved } from '$lib/services/zomes/group.service';

  interface Props {
    groupId: string;
  }

  let { groupId }: Props = $props();

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

  <section class="mt-8">
    <h2 class="mb-2 text-lg font-semibold text-gray-800">Members</h2>
    {#if members.length === 0}
      <p class="border border-dashed border-gray-400 rounded p-4 text-sm text-gray-500">No members (stub).</p>
    {:else}
      <ul class="space-y-2">
        {#each members as m (m.id)}
          <li class="rounded border border-gray-200 bg-white p-3 text-sm">{m.name}</li>
        {/each}
      </ul>
    {/if}
  </section>

  <section class="mt-8">
    <h2 class="mb-2 text-lg font-semibold text-gray-800">Work log</h2>
    {#if worklogs.length === 0}
      <p class="border border-dashed border-gray-400 rounded p-4 text-sm text-gray-500">No work log entries (stub).</p>
    {:else}
      <ul class="space-y-2">
        {#each worklogs as w (w.id)}
          <li class="rounded border border-gray-200 bg-white p-3 text-sm">{w.title}</li>
        {/each}
      </ul>
    {/if}
  </section>

  <section class="mt-8">
    <h2 class="mb-2 text-lg font-semibold text-gray-800">Soft links</h2>
    {#if softlinks.length === 0}
      <p class="border border-dashed border-gray-400 rounded p-4 text-sm text-gray-500">
        No soft links (stub). Planning-only links will use dashed styling when enabled.
      </p>
    {:else}
      <ul class="space-y-2">
        {#each softlinks as s (s.id)}
          <li class="rounded border border-dashed border-gray-400 p-3 text-sm">{s.label}</li>
        {/each}
      </ul>
    {/if}
  </section>
</div>
