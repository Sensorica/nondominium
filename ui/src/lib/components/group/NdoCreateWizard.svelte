<script lang="ts">
  /**
   * Wraps `@nondominium/ndo-ui` wizard create modal. Maps to hApp `NdoInput`,
   * drops Source foreshadow fields, and exposes all seven PropertyRegime values
   * (ndo-ui refinement only offers four). After hard dual create, applies
   * preselected creatable governance templates onto the new Layer 1 spec.
   */
  import { goto } from '$app/navigation';
  import type { NdoDescriptor, PropertyRegime } from '@nondominium/shared-types';
  import {
    NdoCreateModal,
    type NdoInput as NdoUiInput,
    type WizardResult
  } from '@nondominium/ndo-ui';
  import { decodeHashFromBase64 } from '@holochain/client';
  import { groupStore } from '$lib/stores/group.store.svelte';
  import { fromNdoUiCreateInput, toNdoUiDescriptors } from '$lib/utils/ndo-ui-adapters';
  import { applyWizardGovernanceTemplates } from '$lib/utils/apply-wizard-governance';

  interface Props {
    groupId: string;
    groupName?: string;
    existingNdos?: NdoDescriptor[];
    onclose: () => void;
  }

  let { groupId, groupName, existingNdos = [], onclose }: Props = $props();

  const allRegimes: PropertyRegime[] = [
    'Private',
    'Commons',
    'Collective',
    'Pool',
    'CommonPool',
    'Public',
    'Nondominium'
  ];

  let isSubmitting = $state(false);
  let errorMessage = $state<string | null>(null);
  /** Optional override so Collective / Pool / Public remain creatable. */
  let regimeOverride = $state<PropertyRegime | ''>('');
  let lastWizardResult = $state<WizardResult | null>(null);

  function handleWizardComplete(result: WizardResult) {
    lastWizardResult = result;
  }

  async function handleSubmit(input: NdoUiInput) {
    isSubmitting = true;
    errorMessage = null;
    const mapped = fromNdoUiCreateInput(input);
    if (regimeOverride) {
      mapped.property_regime = regimeOverride;
    }
    const created = await groupStore.createNdo(mapped);
    if (!created) {
      isSubmitting = false;
      errorMessage = groupStore.errorMessage ?? 'Failed to create NDO.';
      return;
    }

    const templateIds =
      lastWizardResult?.ndo_input.governance_rule_ids ?? input.governance_rule_ids ?? [];
    if (created.specificationActionHash && templateIds.length > 0) {
      try {
        await applyWizardGovernanceTemplates({
          ndoIdentityHash: decodeHashFromBase64(created.hashB64),
          specificationHash: created.specificationActionHash,
          cellId: created.cellId,
          templateIds,
          propertyRegime: mapped.property_regime,
          resourceNature: mapped.resource_nature,
          economicMode: mapped.economic_mode ?? null,
          useKind: mapped.use_kind ?? null,
          maxConcurrentUsers: mapped.max_concurrent_users ?? null
        });
      } catch {
        // Best-effort: NDO + inventory already exist; Governance tab can retry.
      }
    }

    isSubmitting = false;
    onclose();
    await goto(`/ndo/${encodeURIComponent(created.hashB64)}`);
  }
</script>

<div class="relative">
  <div
    class="pointer-events-none fixed inset-x-0 top-3 z-[60] flex justify-center px-4"
    aria-live="polite"
  >
    <label
      class="pointer-events-auto flex items-center gap-2 rounded-lg border border-gray-200 bg-white/95 px-3 py-2 text-xs text-gray-700 shadow-sm backdrop-blur"
    >
      <span class="font-medium text-gray-800">Final property regime</span>
      <select
        bind:value={regimeOverride}
        class="rounded border border-gray-300 bg-white px-2 py-1 text-xs"
        title="Wizard offers four regimes; choose Collective, Pool, or Public here when needed. Leave as Wizard default to keep the wizard choice."
      >
        <option value="">Wizard default</option>
        {#each allRegimes as r}
          <option value={r}>{r}</option>
        {/each}
      </select>
    </label>
  </div>

  <NdoCreateModal
    {groupId}
    {groupName}
    existingNdos={toNdoUiDescriptors(existingNdos)}
    {isSubmitting}
    {errorMessage}
    initialArchetype="stub"
    {onclose}
    onwizardcomplete={handleWizardComplete}
    onsubmit={handleSubmit}
  />
</div>
