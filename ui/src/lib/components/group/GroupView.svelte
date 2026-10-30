<script lang="ts">
  /**
   * Group as Perspective host (release-prototype Resource Perspective IA).
   * Resource + Agent live; Intelligence / Work stay Soon. Commitment Pool
   * mounts on the Resource view.
   */
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import type {
    GroupMemberProfile,
    NdoDescriptor,
    NdoInput,
    PrivateParticipationClaim
  } from '@nondominium/shared-types';
  import {
    Breadcrumb,
    PerspectiveSwitcher,
    ResourcePerspective,
    type BreadcrumbItem,
    type PerspectiveId
  } from '@nondominium/ndo-ui';
  import { appContext } from '$lib/stores/app.context.svelte';
  import { groupStore } from '$lib/stores/group.store.svelte';
  import { lobbyStore } from '$lib/stores/lobby.store.svelte';
  import { navTrail } from '$lib/stores/nav-trail.svelte';
  import { toNdoUiDescriptors } from '$lib/utils/ndo-ui-adapters';
  import { encodeHashToBase64 } from '@holochain/client';
  import { governanceStore } from '$lib/stores/governance.store.svelte';
  import { devStorageKey } from '$lib/utils/hc-connect';
  import GroupProfileModal from './GroupProfileModal.svelte';
  import MemberList from './MemberList.svelte';
  import PoolSection from './PoolSection.svelte';
  import NdoCreateWizard from './NdoCreateWizard.svelte';
  import AgentDirectory, { type AgentDirectoryPerson } from './AgentDirectory.svelte';
  import AgentProfileView, { type AgentConnection } from './AgentProfileView.svelte';
  import { NdoButton } from '@nondominium/ndo-ui';

  interface Props {
    groupId: string;
    autoOpenCreateModal?: boolean;
  }

  let { groupId, autoOpenCreateModal = false }: Props = $props();

  let inviteCopied = $state(false);
  let showCreateModal = $state(false);
  let showProfileModal = $state(false);
  let selfClaims = $state<Array<{ claim: PrivateParticipationClaim }>>([]);

  const VISITED_KEY = devStorageKey('ndo_group_visited_v1');

  function hasVisited(id: string): boolean {
    try {
      const raw = localStorage.getItem(VISITED_KEY);
      const visited: string[] = raw ? JSON.parse(raw) : [];
      return visited.includes(id);
    } catch {
      return false;
    }
  }

  function markVisited(id: string): void {
    try {
      const raw = localStorage.getItem(VISITED_KEY);
      const visited: string[] = raw ? JSON.parse(raw) : [];
      if (!visited.includes(id)) {
        localStorage.setItem(VISITED_KEY, JSON.stringify([...visited, id]));
      }
    } catch {
      // localStorage unavailable
    }
  }

  function saveGroupProfile(profile: GroupMemberProfile): void {
    void lobbyStore.saveGroupMemberProfile(groupId, profile);
    markVisited(groupId);
  }

  async function copyInviteLink() {
    const link = await lobbyStore.generateInviteLink(groupId);
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      inviteCopied = true;
      setTimeout(() => {
        inviteCopied = false;
      }, 2000);
    } catch {
      // clipboard unavailable
    }
  }

  const perspectiveParam = $derived($page.url.searchParams.get('perspective'));
  const agentParam = $derived($page.url.searchParams.get('agent'));
  const activePerspective = $derived<PerspectiveId>(
    perspectiveParam === 'agent' ? 'agent' : 'resource'
  );

  const myKeyB64 = $derived(
    appContext.myAgentPubKey ? encodeHashToBase64(appContext.myAgentPubKey) : null
  );

  const people = $derived<AgentDirectoryPerson[]>(
    groupStore.members.map((m) => ({
      id: m.id,
      name: m.name,
      bio: undefined,
      skills: m.role ? [m.role] : undefined
    }))
  );

  const selectedPerson = $derived(
    agentParam ? (people.find((p) => p.id === agentParam) ?? null) : null
  );

  const initiatedBySelected = $derived.by((): NdoDescriptor[] => {
    if (!agentParam) return [];
    return groupStore.groupNdos.filter((d) => d.initiator === agentParam);
  });

  const connections = $derived.by((): AgentConnection[] => {
    if (!agentParam) return [];
    const others = people.filter((p) => p.id !== agentParam);
    return others.map((p) => ({
      agentId: p.id,
      name: p.name,
      reasons: ['same_group' as const]
    }));
  });

  const isSelf = $derived(!!(agentParam && myKeyB64 && agentParam === myKeyB64));

  const breadcrumb = $derived.by((): BreadcrumbItem[] => {
    const groupName = groupStore.group?.name ?? 'Group';
    const items: BreadcrumbItem[] = [
      { label: 'Lobby', href: '/' },
      { label: groupName, href: `/group/${encodeURIComponent(groupId)}` }
    ];
    if (activePerspective === 'agent') {
      items.push({
        label: 'Agent',
        href: agentParam
          ? `/group/${encodeURIComponent(groupId)}?perspective=agent`
          : undefined
      });
      if (selectedPerson) items.push({ label: selectedPerson.name });
    } else {
      items.push({ label: 'Resource' });
    }
    return items;
  });

  function groupUrl(opts?: { perspective?: 'resource' | 'agent'; agent?: string | null }) {
    const params = new URLSearchParams();
    if (opts?.perspective === 'agent') params.set('perspective', 'agent');
    if (opts?.agent) params.set('agent', opts.agent);
    const q = params.toString();
    return `/group/${encodeURIComponent(groupId)}${q ? `?${q}` : ''}`;
  }

  function currentHref(): string {
    return `${$page.url.pathname}${$page.url.search}`;
  }

  function currentLabel(): string {
    if (selectedPerson) return selectedPerson.name;
    if (activePerspective === 'agent') return 'Agent';
    return groupStore.group?.name ?? 'Group';
  }

  function handlePerspectiveSelect(id: PerspectiveId) {
    navTrail.clear();
    if (id === 'agent') {
      void goto(groupUrl({ perspective: 'agent' }));
    } else if (id === 'resource') {
      void goto(groupUrl());
    }
  }

  function jumpToAgent(agentId: string) {
    navTrail.push({ label: currentLabel(), href: currentHref() });
    void goto(groupUrl({ perspective: 'agent', agent: agentId }));
  }

  function handleSelectAgent(id: string) {
    if (agentParam) {
      navTrail.push({ label: currentLabel(), href: currentHref() });
    }
    void goto(groupUrl({ perspective: 'agent', agent: id }));
  }

  function handleClearAgent() {
    void goto(groupUrl({ perspective: 'agent' }));
  }

  function handleBack() {
    const top = navTrail.pop();
    if (top) void goto(top.href);
    else handleClearAgent();
  }

  function handleSelectGroup(id: string) {
    navTrail.clear();
    void goto(`/group/${encodeURIComponent(id)}?perspective=agent`);
  }

  function handleResources(id: string) {
    navTrail.clear();
    void goto(`/group/${encodeURIComponent(id)}`);
  }

  function handleSelectNdo(hash: string) {
    navTrail.push({ label: currentLabel(), href: currentHref() });
    void goto(`/ndo/${encodeURIComponent(hash)}`);
  }

  async function loadSelfClaims() {
    if (!isSelf) {
      selfClaims = [];
      return;
    }
    const out = await governanceStore.fetchMyParticipationClaims({ limit: 24 });
    selfClaims = out ? out.claims.map((c) => ({ claim: c.claim })) : [];
  }

  $effect(() => {
    appContext.currentView = 'group';
    appContext.selectedGroupId = groupId;
    void groupStore.loadGroupData(groupId);
    if (!hasVisited(groupId)) {
      showProfileModal = true;
    }
  });

  $effect(() => {
    void groupId;
    if (typeof window === 'undefined') return;

    const POLL_INTERVAL_MS = 8000;
    const refresh = () => {
      void groupStore.refreshCurrentGroup();
    };
    const onFocus = () => refresh();
    const onVisibility = () => {
      if (document.visibilityState === 'visible') refresh();
    };

    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);
    const intervalId = window.setInterval(() => {
      if (document.visibilityState === 'visible') refresh();
    }, POLL_INTERVAL_MS);

    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
      window.clearInterval(intervalId);
    };
  });

  $effect(() => {
    if (autoOpenCreateModal || $page.url.searchParams.get('createNdo') === '1') {
      showCreateModal = true;
    }
  });

  function closeCreateModal() {
    showCreateModal = false;
    if ($page.url.searchParams.get('createNdo') === '1') {
      const next = new URL($page.url);
      next.searchParams.delete('createNdo');
      void goto(`${next.pathname}${next.search}${next.hash}`, {
        replaceState: true,
        noScroll: true,
        keepFocus: true
      });
    }
  }

  $effect(() => {
    void agentParam;
    void isSelf;
    void loadSelfClaims();
  });
</script>

{#if showCreateModal}
  <NdoCreateWizard
    {groupId}
    groupName={groupStore.group?.name}
    existingNdos={lobbyStore.ndos}
    onclose={closeCreateModal}
  />
{/if}

{#if showProfileModal}
  <GroupProfileModal
    {groupId}
    onclose={() => {
      showProfileModal = false;
      markVisited(groupId);
    }}
    onsave={(profile) => {
      saveGroupProfile(profile);
      showProfileModal = false;
    }}
  />
{/if}

<div class="p-6" data-testid="group-perspectives-view">
  <div class="mb-3">
    <Breadcrumb items={breadcrumb} />
  </div>

  <div class="mb-4 flex items-start justify-between gap-3">
    <div>
      <h1 class="text-2xl font-bold text-gray-900">{groupStore.group?.name ?? 'Group'}</h1>
      <p class="mt-1 font-mono text-sm text-gray-400">{groupId}</p>
    </div>
    <div class="flex flex-wrap items-center gap-2">
      <NdoButton variant="ghost" onclick={() => void copyInviteLink()}>
        {inviteCopied ? 'Invite link copied!' : 'Copy invite link'}
      </NdoButton>
      <NdoButton onclick={() => (showCreateModal = true)}>
        <span class="text-base leading-none">+</span> Create NDO
      </NdoButton>
    </div>
  </div>

  <div class="mb-4">
    <PerspectiveSwitcher active={activePerspective} onselect={handlePerspectiveSelect} />
  </div>

  {#if groupStore.errorMessage}
    <p class="mb-4 rounded border border-red-200 bg-red-50 p-2 text-sm text-red-700">
      {groupStore.errorMessage}
    </p>
  {/if}

  {#if activePerspective === 'agent'}
    {#if agentParam}
      <AgentProfileView
        agentId={agentParam}
        agentName={selectedPerson?.name ?? agentParam.slice(0, 12)}
        bio={selectedPerson?.bio ?? null}
        roleInGroup={selectedPerson?.skills?.[0] ?? null}
        theirGroups={lobbyStore.groups}
        initiated={initiatedBySelected}
        joined={[]}
        {connections}
        {isSelf}
        claims={selfClaims}
        trailTop={navTrail.top}
        onselectndo={handleSelectNdo}
        onselectagent={handleSelectAgent}
        onselectgroup={handleSelectGroup}
        onback={handleBack}
      />
    {:else}
      <AgentDirectory
        {groupId}
        groupName={groupStore.group?.name}
        {people}
        groups={lobbyStore.groups}
        onselectagent={handleSelectAgent}
        onselectgroup={handleSelectGroup}
        onresources={handleResources}
      />
    {/if}
  {:else}
    <ResourcePerspective
      ndos={toNdoUiDescriptors(groupStore.groupNdos)}
      myAgentKey={myKeyB64}
      joinedHashes={[]}
      isLoading={groupStore.isLoading}
      ndoHref={(hash) => `/ndo/${encodeURIComponent(hash)}`}
      oncreateclick={() => (showCreateModal = true)}
    />

    <div class="mt-6">
      <MemberList
        members={groupStore.members}
        onmemberclick={(m) => jumpToAgent(m.id)}
      />
    </div>

    <PoolSection />
  {/if}
</div>
