<script lang="ts">
  import type { ActionHash, AgentPubKey, CellId } from '@holochain/client';
  import type {
    PersonRole,
    PropertyRegime,
    ResourceNature,
    Rivalry,
    RuleData
  } from '@nondominium/shared-types';
  // The '+ New rule' handler still reads listings through resourceStore: it is inline in the
  // markup, which this refactor leaves untouched (design-system fidelity), so it is not moved.
  import { resourceStore } from '$lib/stores/resource.store.svelte';
  import { getNdoStore, isTaskInterrupted, type RuleWithSpec } from '$lib/stores/ndo.store.svelte';
  import RuleEditorModal from './RuleEditorModal.svelte';

  interface Props {
    /** NDO Layer 0 action hash. */
    specActionHash: ActionHash;
    /** The NDO's own clone cell; null for legacy NDOs in the shared cell. */
    ndoCellId?: CellId | null;
    propertyRegime?: string | null;
    resourceNature?: string | null;
    rivalryOverride?: string | null;
  }

  let {
    specActionHash,
    ndoCellId = null,
    propertyRegime = null,
    resourceNature = null,
    rivalryOverride = null
  }: Props = $props();

  const ndo = getNdoStore();

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

  /** Returns false when the NDO store was destroyed before the read finished. */
  async function loadRules(): Promise<boolean> {
    let result;
    try {
      result = await ndo().governanceRules();
    } catch (error) {
      if (isTaskInterrupted(error)) return false;
      throw error;
    }
    if (!result.hasSpecifications) {
      rules = [];
      loadMessage = 'No Layer 1 specifications yet — create one on the Resources tab before adding rules.';
      return true;
    }
    rules = result.rules;
    loadMessage = result.rules.length === 0 ? 'No governance rules linked to this NDO’s specifications.' : null;
    return true;
  }

  $effect(() => {
    void specActionHash;
    void (async () => {
      if (!(await loadRules())) return;

      let mine;
      try {
        mine = await ndo().myRoles();
      } catch (error) {
        if (isTaskInterrupted(error)) return;
        throw error;
      }
      myAgent = mine.agent;
      roles = mine.roles;
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
    {ndoCellId}
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
          const listings = await resourceStore.fetchSpecificationsForNdo(
            specActionHash,
            ndoCellId ?? undefined
          );
          // A rule with no specification_hash is written but never linked, so no
          // read path can surface it again. Refuse rather than orphan it.
          if (listings.length === 0) {
            loadMessage =
              'No Layer 1 specifications yet - create one on the Resources tab before adding rules.';
            return;
          }
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
