<script lang="ts">
  import type { ActionHash, AgentPubKey, CellId } from '@holochain/client';
  import { encodeHashToBase64 } from '@holochain/client';
  import { GovernanceTemplatePicker, NdoButton } from '@nondominium/ndo-ui';
  import type {
    GovernanceRuleInput,
    NdoDescriptor,
    PersonRole,
    PropertyRegime,
    ResourceNature,
    Rivalry,
    RuleData
  } from '@nondominium/shared-types';
  import { resourceStore } from '$lib/stores/resource.store.svelte';
  import { getNdoStore, isTaskInterrupted, type RuleWithSpec } from '$lib/stores/ndo.store.svelte';
  import { toNdoUiDescriptor } from '$lib/utils/ndo-ui-adapters';
  import {
    CREATABLE_TEMPLATE_IDS,
    mapTemplateToRuleData,
    regimeForTemplateRecommendations
  } from '$lib/utils/governance-template-map';
  import RuleEditorModal from './RuleEditorModal.svelte';

  interface Props {
    /** NDO Layer 0 action hash. */
    specActionHash: ActionHash;
    /** The NDO's own clone cell; null for legacy NDOs in the shared cell. */
    ndoCellId?: CellId | null;
    propertyRegime?: string | null;
    resourceNature?: string | null;
    rivalryOverride?: string | null;
    ndoDescriptor?: NdoDescriptor | null;
  }

  let {
    specActionHash,
    ndoCellId = null,
    propertyRegime = null,
    resourceNature = null,
    rivalryOverride = null,
    ndoDescriptor = null
  }: Props = $props();

  const ndo = getNdoStore();

  let rules = $state<RuleWithSpec[]>([]);
  let roles = $state<PersonRole[]>([]);
  let myAgent = $state<AgentPubKey | null>(null);
  let loadMessage = $state<string | null>(null);
  let showRuleEditor = $state(false);
  let editorSpecHash = $state<ActionHash | undefined>(undefined);
  let selectedTemplateIds = $state<string[]>([]);
  let applyBusy = $state(false);
  let applyMessage = $state<string | null>(null);

  const pickerDescriptor = $derived.by((): NdoDescriptor => {
    const base =
      ndoDescriptor ??
      ({
        hash: encodeHashToBase64(specActionHash),
        name: 'NDO',
        lifecycle_stage: null,
        property_regime: propertyRegime,
        resource_nature: resourceNature,
        description: null,
        initiator: null,
        created_at: null,
        successor_ndo_hash: null,
        hibernation_origin: null,
        rivalry_override: rivalryOverride
      } satisfies NdoDescriptor);
    return {
      ...base,
      property_regime: regimeForTemplateRecommendations(base.property_regime)
    };
  });

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
      loadMessage =
        'No Layer 1 specifications yet — create one on the Resources tab before adding rules.';
      return true;
    }
    rules = result.rules;
    loadMessage =
      result.rules.length === 0
        ? 'No governance rules linked to this NDO’s specifications.'
        : null;
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

  async function resolveSpecHash(): Promise<ActionHash | null> {
    const listings = await resourceStore.fetchSpecificationsForNdo(
      specActionHash,
      ndoCellId ?? undefined
    );
    if (listings.length === 0) {
      loadMessage =
        'No Layer 1 specifications yet - create one on the Resources tab before adding rules.';
      return null;
    }
    return listings[0]?.action_hash ?? null;
  }

  async function openCustomEditor() {
    const hash = await resolveSpecHash();
    if (!hash) return;
    editorSpecHash = hash;
    showRuleEditor = true;
  }

  async function applySelectedTemplates() {
    if (!canCreateRule || selectedTemplateIds.length === 0) return;
    applyBusy = true;
    applyMessage = null;
    const specHash = await resolveSpecHash();
    if (!specHash) {
      applyBusy = false;
      return;
    }

    const creatable = selectedTemplateIds.filter((id) => CREATABLE_TEMPLATE_IDS.has(id));
    const skipped = selectedTemplateIds.filter((id) => !CREATABLE_TEMPLATE_IDS.has(id));
    const notes: string[] = [];
    let created = 0;
    let failed = 0;

    for (const id of creatable) {
      const mapped = mapTemplateToRuleData(id);
      if (!mapped) {
        skipped.push(id);
        continue;
      }
      if (mapped.note) notes.push(mapped.note);

      const input: GovernanceRuleInput = {
        rule_data: mapped.rule_data,
        ...(mapped.enforced_by && { enforced_by: mapped.enforced_by }),
        ndo_identity_hash: specActionHash,
        property_regime: propertyRegime as PropertyRegime,
        resource_nature: resourceNature as ResourceNature,
        ...(rivalryOverride && { rivalry_override: rivalryOverride as Rivalry }),
        specification_hash: specHash
      };

      const violations = await resourceStore.checkRuleDataConstraints(
        {
          property_regime: input.property_regime,
          resource_nature: input.resource_nature,
          ...(input.rivalry_override && { rivalry_override: input.rivalry_override }),
          rule_data: input.rule_data
        },
        ndoCellId ?? undefined
      );
      const hard = violations.filter((v) => v.severity === 'Hard');
      if (hard.length > 0) {
        failed += 1;
        notes.push(`${id}: ${hard.map((v) => v.message).join('; ')}`);
        continue;
      }

      const ok = await resourceStore.createGovernanceRule(input, ndoCellId ?? undefined);
      if (ok) created += 1;
      else failed += 1;
    }

    applyBusy = false;
    selectedTemplateIds = [];
    const parts = [`Created ${created} rule(s).`];
    if (failed > 0) parts.push(`${failed} failed.`);
    if (skipped.length > 0) {
      parts.push(
        `Skipped (not yet creatable): ${[...new Set(skipped)].join(', ')}.`
      );
    }
    if (notes.length > 0) parts.push(notes.join(' '));
    applyMessage = parts.join(' ');
    await loadRules();
  }
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
        onclick={() => void openCustomEditor()}
        class="rounded border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-800 hover:bg-gray-50 disabled:opacity-50"
      >
        Custom rule…
      </button>
    </div>

    {#if canCreateRule}
      <div class="mb-4 rounded-lg border border-gray-200 bg-white p-4">
        <h4 class="mb-3 text-sm font-semibold text-gray-800">Recommended templates</h4>
        <GovernanceTemplatePicker
          descriptor={toNdoUiDescriptor(pickerDescriptor)}
          selectedRuleIds={selectedTemplateIds}
          onchange={(ids) => {
            selectedTemplateIds = ids;
          }}
        />
        <div class="mt-3 flex flex-wrap items-center gap-2">
          <NdoButton
            variant="primary"
            disabled={applyBusy || selectedTemplateIds.length === 0}
            onclick={() => void applySelectedTemplates()}
          >
            {applyBusy ? 'Applying…' : 'Apply selected'}
          </NdoButton>
          <p class="text-xs text-gray-500">
            Attribution, integrity, capacity, and Source templates are listed when recommended but
            skipped until their schemas land.
          </p>
        </div>
        {#if applyMessage}
          <p class="mt-2 text-xs text-gray-600">{applyMessage}</p>
        {/if}
      </div>
    {/if}

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
