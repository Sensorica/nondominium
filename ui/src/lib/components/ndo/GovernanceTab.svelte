<script lang="ts">
  import type { ActionHash, AgentPubKey } from '@holochain/client';
  import type {
    GovernanceRule,
    PersonRole,
    PropertyRegime,
    ResourceNature,
    Rivalry,
    RuleData
  } from '@nondominium/shared-types';
  import { Effect as E, Exit, pipe } from 'effect';
  import { PersonServiceTag, PersonServiceResolved } from '$lib/services/zomes/person.service';
  import { ResourceServiceTag, ResourceServiceResolved } from '$lib/services/zomes/resource.service';
  import holochainClientService from '$lib/services/holochain.service.svelte';
  import { resourceStore } from '$lib/stores/resource.store.svelte';
  import RuleEditorModal from './RuleEditorModal.svelte';

  interface Props {
    /** NDO Layer 0 action hash. */
    specActionHash: ActionHash;
    propertyRegime?: string | null;
    resourceNature?: string | null;
    rivalryOverride?: string | null;
  }

  let {
    specActionHash,
    propertyRegime = null,
    resourceNature = null,
    rivalryOverride = null
  }: Props = $props();

  type RuleWithSpec = { rule: GovernanceRule; specName: string; specHash: ActionHash };

  let rules = $state<RuleWithSpec[]>([]);
  let roles = $state<PersonRole[]>([]);
  let myAgent = $state<AgentPubKey | null>(null);
  let loadMessage = $state<string | null>(null);
  let showRuleEditor = $state(false);
  let editorSpecHash = $state<ActionHash | undefined>(undefined);

  function ruleTypeLabel(ruleData: RuleData): string {
    return Object.keys(ruleData)[0] ?? 'Unknown';
  }

  function rulePayload(ruleData: RuleData): Record<string, unknown> {
    const key = Object.keys(ruleData)[0];
    if (!key) return {};
    const payload = (ruleData as unknown as Record<string, unknown>)[key];
    if (payload && typeof payload === 'object') {
      return payload as Record<string, unknown>;
    }
    return {};
  }

  async function loadRules() {
    const listings = await resourceStore.fetchSpecificationsForNdo(specActionHash);
    if (listings.length === 0) {
      rules = [];
      loadMessage = 'No Layer 1 specifications yet — create one on the Resources tab before adding rules.';
      return;
    }
    const collected: RuleWithSpec[] = [];
    for (const listing of listings) {
      const program = E.gen(function* () {
        const r = yield* ResourceServiceTag;
        return yield* r.getResourceSpecificationWithRules(listing.action_hash);
      });
      const exit = await E.runPromiseExit(pipe(program, E.provide(ResourceServiceResolved)));
      if (Exit.isSuccess(exit)) {
        for (const rule of exit.value.governance_rules) {
          collected.push({
            rule,
            specName: listing.specification.name,
            specHash: listing.action_hash
          });
        }
      }
    }
    rules = collected;
    loadMessage = collected.length === 0 ? 'No governance rules linked to this NDO’s specifications.' : null;
  }

  $effect(() => {
    void specActionHash;
    void (async () => {
      await loadRules();

      try {
        myAgent = await holochainClientService.getMyAgentPubKey();
      } catch {
        myAgent = null;
      }

      if (!myAgent) {
        roles = [];
        return;
      }

      const rolesProgram = E.gen(function* () {
        const p = yield* PersonServiceTag;
        return yield* p.getPersonRoles(myAgent!);
      });
      const rolesExit = await E.runPromiseExit(pipe(rolesProgram, E.provide(PersonServiceResolved)));
      roles = Exit.isSuccess(rolesExit) ? rolesExit.value : [];
    })();
  });

  const canCreateRule = $derived(
    propertyRegime != null &&
      resourceNature != null &&
      (propertyRegime as PropertyRegime) &&
      (resourceNature as ResourceNature)
  );
</script>

{#if showRuleEditor && canCreateRule}
  <RuleEditorModal
    ndoIdentityHash={specActionHash}
    propertyRegime={propertyRegime as PropertyRegime}
    resourceNature={resourceNature as ResourceNature}
    rivalryOverride={(rivalryOverride as Rivalry | null) ?? undefined}
    specActionHash={editorSpecHash}
    onclose={() => {
      showRuleEditor = false;
      editorSpecHash = undefined;
    }}
    oncreated={() => {
      void loadRules();
    }}
  />
{/if}

<div class="space-y-6">
  <section>
    <div class="mb-2 flex items-center justify-between gap-3">
      <h3 class="text-base font-semibold text-gray-900">Governance rules</h3>
      <button
        type="button"
        disabled={!canCreateRule}
        onclick={async () => {
          const listings = await resourceStore.fetchSpecificationsForNdo(specActionHash);
          editorSpecHash = listings[0]?.action_hash;
          showRuleEditor = true;
        }}
        class="rounded bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        + New rule
      </button>
    </div>

    {#if loadMessage && rules.length === 0}
      <p class="text-sm text-gray-500">{loadMessage}</p>
    {:else if rules.length === 0}
      <p class="text-sm text-gray-500">No governance rules linked to this NDO’s specifications.</p>
    {:else}
      <ul class="space-y-2">
        {#each rules as item, i (i)}
          {@const kind = ruleTypeLabel(item.rule.rule_data)}
          {@const payload = rulePayload(item.rule.rule_data)}
          <li class="rounded border border-gray-200 bg-white p-3 text-sm">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <div class="font-medium text-gray-800">{kind}</div>
              <div class="text-xs text-gray-500">spec: {item.specName}</div>
            </div>
            <dl class="mt-2 grid grid-cols-1 gap-1 text-xs text-gray-600 sm:grid-cols-2">
              {#each Object.entries(payload) as [k, v] (k)}
                <div>
                  <span class="font-medium text-gray-700">{k}:</span>
                  {v === undefined || v === null || v === '' ? '—' : String(v)}
                </div>
              {/each}
            </dl>
            {#if item.rule.enforced_by}
              <div class="mt-1 text-xs text-gray-500">Enforced by: {item.rule.enforced_by}</div>
            {/if}
          </li>
        {/each}
      </ul>
    {/if}
  </section>

  <section>
    <h3 class="mb-2 text-base font-semibold text-gray-900">My roles (person zome)</h3>
    {#if !myAgent}
      <p class="text-sm text-gray-500">No person profile loaded for this agent.</p>
    {:else if roles.length === 0}
      <p class="text-sm text-gray-500">No roles returned for your agent.</p>
    {:else}
      <ul class="space-y-2">
        {#each roles as role, i (i)}
          <li class="rounded border border-gray-200 bg-white px-3 py-2 text-sm">
            <span class="font-medium text-gray-800">{role.role_name}</span>
          </li>
        {/each}
      </ul>
      <button
        type="button"
        class="mt-3 rounded bg-amber-100 px-3 py-1.5 text-xs text-amber-800"
        disabled>AccountableAgent (governance-gated)</button
      >
    {/if}
  </section>
</div>
