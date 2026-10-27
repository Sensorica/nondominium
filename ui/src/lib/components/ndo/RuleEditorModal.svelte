<script lang="ts">
  import type { ActionHash, CellId } from '@holochain/client';
  import type {
    Accessibility,
    GovernanceRuleType,
    PropertyRegime,
    ResourceNature,
    Rivalry,
    RuleData,
    TransferType,
    ConstraintViolation
  } from '@nondominium/shared-types';
  import { resourceStore } from '$lib/stores/resource.store.svelte';

  interface Props {
    ndoIdentityHash: ActionHash;
    /** The NDO's own clone cell; null for legacy NDOs in the shared cell. */
    ndoCellId?: CellId | null;
    propertyRegime: PropertyRegime;
    resourceNature: ResourceNature;
    rivalryOverride?: Rivalry;
    specActionHash?: ActionHash;
    onclose: () => void;
    oncreated?: () => void;
  }

  let {
    ndoIdentityHash,
    ndoCellId = null,
    propertyRegime,
    resourceNature,
    rivalryOverride,
    specActionHash,
    onclose,
    oncreated
  }: Props = $props();

  type RuleKind = GovernanceRuleType;
  let ruleKind = $state<RuleKind>('AccessRequirement');

  // AccessRequirement
  let accessibility = $state<Accessibility>('Free');
  let requiredRole = $state('');
  let minAffiliation = $state('');

  // UsageLimit
  let maxDurationHours = $state('');
  let maxQuantityPerPeriod = $state('');
  let periodDays = $state('');

  // TransferCondition
  let transferType = $state<TransferType>('Custody');
  let requiresValidation = $state(false);
  let validatorRole = $state('');

  // MaintenanceSchedule
  let intervalDays = $state('30');
  let maintenanceRole = $state('');

  let enforcedBy = $state('');
  let isSubmitting = $state(false);
  let errorMessage = $state('');
  let violations = $state<ConstraintViolation[]>([]);
  let dryRunPending = $state(false);

  function buildRuleData(): RuleData {
    switch (ruleKind) {
      case 'AccessRequirement':
        return {
          AccessRequirement: {
            accessibility,
            ...(requiredRole.trim() && { required_role: requiredRole.trim() }),
            ...(minAffiliation.trim() && { min_affiliation: minAffiliation.trim() })
          }
        };
      case 'UsageLimit':
        return {
          UsageLimit: {
            ...(maxDurationHours !== '' && { max_duration_hours: Number(maxDurationHours) }),
            ...(maxQuantityPerPeriod !== '' && {
              max_quantity_per_period: Number(maxQuantityPerPeriod)
            }),
            ...(periodDays !== '' && { period_days: Number(periodDays) })
          }
        };
      case 'TransferCondition':
        return {
          TransferCondition: {
            transfer_type: transferType,
            requires_validation: requiresValidation,
            ...(validatorRole.trim() && { validator_role: validatorRole.trim() })
          }
        };
      case 'MaintenanceSchedule':
        return {
          MaintenanceSchedule: {
            interval_days: Number(intervalDays) || 1,
            ...(maintenanceRole.trim() && { required_role: maintenanceRole.trim() })
          }
        };
    }
  }

  const hardViolations = $derived(violations.filter((v) => v.severity === 'Hard'));
  const softViolations = $derived(violations.filter((v) => v.severity === 'Soft'));
  const canSubmit = $derived(hardViolations.length === 0 && !dryRunPending);

  let debounceTimer: ReturnType<typeof setTimeout> | undefined;

  async function runDryRun() {
    dryRunPending = true;
    const rule_data = buildRuleData();
    violations = await resourceStore.checkRuleDataConstraints(
      {
        property_regime: propertyRegime,
        resource_nature: resourceNature,
        ...(rivalryOverride && { rivalry_override: rivalryOverride }),
        rule_data
      },
      ndoCellId ?? undefined
    );
    dryRunPending = false;
  }

  $effect(() => {
    // Track form fields for debounced dry-run
    void ruleKind;
    void accessibility;
    void requiredRole;
    void minAffiliation;
    void maxDurationHours;
    void maxQuantityPerPeriod;
    void periodDays;
    void transferType;
    void requiresValidation;
    void validatorRole;
    void intervalDays;
    void maintenanceRole;

    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      void runDryRun();
    }, 300);
    return () => clearTimeout(debounceTimer);
  });

  async function handleSubmit() {
    await runDryRun();
    if (hardViolations.length > 0) {
      errorMessage = 'Resolve Hard constraint violations before submitting.';
      return;
    }
    isSubmitting = true;
    errorMessage = '';
    const ok = await resourceStore.createGovernanceRule(
      {
        rule_data: buildRuleData(),
        ...(enforcedBy.trim() && { enforced_by: enforcedBy.trim() }),
        ndo_identity_hash: ndoIdentityHash,
        property_regime: propertyRegime,
        resource_nature: resourceNature,
        ...(rivalryOverride && { rivalry_override: rivalryOverride }),
        ...(specActionHash && { specification_hash: specActionHash })
      },
      ndoCellId ?? undefined
    );
    isSubmitting = false;
    if (ok) {
      oncreated?.();
      onclose();
    } else {
      errorMessage = resourceStore.errorMessage ?? 'Failed to create governance rule.';
    }
  }
</script>

<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
  <div
    class="relative w-full max-w-lg rounded-xl border border-gray-200 bg-white shadow-xl"
    role="dialog"
    aria-modal="true"
    aria-labelledby="rule-editor-title"
  >
    <div class="border-b border-gray-100 px-6 py-4">
      <h2 id="rule-editor-title" class="text-lg font-semibold text-gray-900">New governance rule</h2>
      <p class="mt-1 text-sm text-gray-500">
        Typed RuleData with live constraint dry-run (Hard blocks submit).
      </p>
    </div>

    <div class="max-h-[70vh] space-y-4 overflow-y-auto px-6 py-4">
      <div>
        <label class="mb-1 block text-sm font-medium text-gray-700" for="rule-kind">Rule type</label>
        <select
          id="rule-kind"
          bind:value={ruleKind}
          class="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        >
          <option value="AccessRequirement">AccessRequirement</option>
          <option value="UsageLimit">UsageLimit</option>
          <option value="TransferCondition">TransferCondition</option>
          <option value="MaintenanceSchedule">MaintenanceSchedule</option>
        </select>
      </div>

      {#if ruleKind === 'AccessRequirement'}
        <div>
          <label class="mb-1 block text-sm font-medium text-gray-700" for="access">Accessibility</label>
          <select
            id="access"
            bind:value={accessibility}
            class="w-full rounded border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="Free">Free</option>
            <option value="Credentialed">Credentialed</option>
            <option value="Gated">Gated</option>
          </select>
        </div>
        <div>
          <label class="mb-1 block text-sm text-gray-600" for="req-role">Required role</label>
          <input id="req-role" type="text" bind:value={requiredRole} class="w-full rounded border border-gray-200 px-3 py-2 text-sm" />
        </div>
        <div>
          <label class="mb-1 block text-sm text-gray-600" for="min-aff">Min affiliation</label>
          <input id="min-aff" type="text" bind:value={minAffiliation} class="w-full rounded border border-gray-200 px-3 py-2 text-sm" />
        </div>
      {:else if ruleKind === 'UsageLimit'}
        <div>
          <label class="mb-1 block text-sm text-gray-600" for="max-dur">Max duration (hours)</label>
          <input id="max-dur" type="number" bind:value={maxDurationHours} class="w-full rounded border border-gray-200 px-3 py-2 text-sm" />
        </div>
        <div>
          <label class="mb-1 block text-sm text-gray-600" for="max-qty">Max quantity / period</label>
          <input id="max-qty" type="number" bind:value={maxQuantityPerPeriod} class="w-full rounded border border-gray-200 px-3 py-2 text-sm" />
        </div>
        <div>
          <label class="mb-1 block text-sm text-gray-600" for="period">Period (days)</label>
          <input id="period" type="number" bind:value={periodDays} class="w-full rounded border border-gray-200 px-3 py-2 text-sm" />
        </div>
      {:else if ruleKind === 'TransferCondition'}
        <div>
          <label class="mb-1 block text-sm font-medium text-gray-700" for="xfer">Transfer type</label>
          <select id="xfer" bind:value={transferType} class="w-full rounded border border-gray-300 px-3 py-2 text-sm">
            <option value="Ownership">Ownership</option>
            <option value="Custody">Custody</option>
            <option value="UseRights">UseRights</option>
            <option value="Benefit">Benefit</option>
          </select>
        </div>
        <label class="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" bind:checked={requiresValidation} />
          Requires validation
        </label>
        <div>
          <label class="mb-1 block text-sm text-gray-600" for="val-role">Validator role</label>
          <input id="val-role" type="text" bind:value={validatorRole} class="w-full rounded border border-gray-200 px-3 py-2 text-sm" />
        </div>
      {:else}
        <div>
          <label class="mb-1 block text-sm font-medium text-gray-700" for="interval">Interval (days)</label>
          <input id="interval" type="number" bind:value={intervalDays} class="w-full rounded border border-gray-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label class="mb-1 block text-sm text-gray-600" for="maint-role">Required role</label>
          <input id="maint-role" type="text" bind:value={maintenanceRole} class="w-full rounded border border-gray-200 px-3 py-2 text-sm" />
        </div>
      {/if}

      <div>
        <label class="mb-1 block text-sm text-gray-600" for="enforced">Enforced by</label>
        <input id="enforced" type="text" bind:value={enforcedBy} class="w-full rounded border border-gray-200 px-3 py-2 text-sm" />
      </div>

      {#if hardViolations.length > 0}
        <ul class="space-y-1 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {#each hardViolations as v (v.rule_id + v.message)}
            <li><span class="font-medium">[{v.rule_id}]</span> {v.message}</li>
          {/each}
        </ul>
      {/if}
      {#if softViolations.length > 0}
        <ul class="space-y-1 rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          {#each softViolations as v (v.rule_id + v.message)}
            <li><span class="font-medium">[{v.rule_id}]</span> {v.message}</li>
          {/each}
        </ul>
      {/if}

      {#if errorMessage}
        <p class="rounded border border-red-200 bg-red-50 p-2 text-sm text-red-700">{errorMessage}</p>
      {/if}
    </div>

    <div class="flex justify-end gap-2 border-t border-gray-100 px-6 py-4">
      <button type="button" onclick={onclose} class="rounded px-4 py-2 text-sm text-gray-600 hover:bg-gray-100"
        >Cancel</button
      >
      <button
        type="button"
        disabled={isSubmitting || !canSubmit}
        onclick={handleSubmit}
        class="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {isSubmitting ? 'Creating…' : 'Create rule'}
      </button>
    </div>
  </div>
</div>
