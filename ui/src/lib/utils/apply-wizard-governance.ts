/**
 * After hard dual create, attach creatable DS governance templates to the new spec.
 * Skips capacity_limit when dual create already wrote it for Use/capacity.
 */
import type { ActionHash, CellId } from '@holochain/client';
import type {
  EconomicMode,
  GovernanceRuleInput,
  PropertyRegime,
  ResourceNature,
  UseKind
} from '@nondominium/shared-types';
import { resourceStore } from '$lib/stores/resource.store.svelte';
import { CREATABLE_TEMPLATE_IDS, mapTemplateToRuleData } from './governance-template-map';

export type ApplyWizardGovernanceOpts = {
  ndoIdentityHash: ActionHash;
  specificationHash: ActionHash;
  cellId: CellId;
  templateIds: string[];
  propertyRegime: PropertyRegime;
  resourceNature: ResourceNature;
  economicMode?: EconomicMode | null;
  useKind?: UseKind | null;
  maxConcurrentUsers?: number | null;
};

export async function applyWizardGovernanceTemplates(
  opts: ApplyWizardGovernanceOpts
): Promise<{ created: number; skipped: string[]; failed: number }> {
  const dualCreatedCapacity =
    opts.economicMode === 'Use' && opts.useKind === 'Capacity';

  let created = 0;
  let failed = 0;
  const skipped: string[] = [];

  for (const id of opts.templateIds) {
    if (dualCreatedCapacity && id === 'capacity_limit') {
      skipped.push(id);
      continue;
    }
    if (!CREATABLE_TEMPLATE_IDS.has(id)) {
      skipped.push(id);
      continue;
    }

    const mapped = mapTemplateToRuleData(id, {
      maxConcurrentUsers: opts.maxConcurrentUsers ?? undefined
    });
    if (!mapped) {
      skipped.push(id);
      continue;
    }

    const input: GovernanceRuleInput = {
      rule_data: mapped.rule_data,
      ...(mapped.enforced_by && { enforced_by: mapped.enforced_by }),
      ndo_identity_hash: opts.ndoIdentityHash,
      property_regime: opts.propertyRegime,
      resource_nature: opts.resourceNature,
      specification_hash: opts.specificationHash
    };

    const violations = await resourceStore.checkRuleDataConstraints(
      {
        property_regime: input.property_regime,
        resource_nature: input.resource_nature,
        rule_data: input.rule_data
      },
      opts.cellId
    );
    if (violations.some((v) => v.severity === 'Hard')) {
      failed += 1;
      continue;
    }

    const ok = await resourceStore.createGovernanceRule(input, opts.cellId);
    if (ok) created += 1;
    else failed += 1;
  }

  return { created, skipped, failed };
}
