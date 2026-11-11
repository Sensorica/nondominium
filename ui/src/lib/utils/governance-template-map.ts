/**
 * Maps design-system governance template IDs onto creatable hApp `RuleData`.
 * Unsupported templates return null (filter / Soon).
 */
import type { RuleData } from '@nondominium/shared-types';

export type TemplateCreateResult = {
  rule_data: RuleData;
  enforced_by?: string;
  /** Shown when the mapping is a stand-in for a non-expressible DS template. */
  note?: string;
};

/** Templates that can be written as live typed RuleData today. */
export const CREATABLE_TEMPLATE_IDS = new Set([
  'access_accountable',
  'access_attribution',
  'quota_extraction',
  'maintenance_schedule',
  'no_ownership_transfer',
  'capacity_limit',
  'max_per_agent'
]);

/**
 * Map a DS template id to RuleData. Returns null for templates that need schema
 * work (integrity, Source-*).
 */
export function mapTemplateToRuleData(
  templateId: string,
  opts?: { maxConcurrentUsers?: number; maxPerAgent?: number }
): TemplateCreateResult | null {
  switch (templateId) {
    case 'access_accountable':
      return {
        rule_data: {
          AccessRequirement: {
            accessibility: 'Credentialed',
            required_role: 'AccountableAgent'
          }
        },
        enforced_by: 'AccountableAgent'
      };
    case 'access_attribution':
      // Attribution-on-share is not a typed RuleData field yet. Free access is the
      // enforceable Commons stand-in so Digital/Commons NDOs can apply a rule today.
      return {
        rule_data: {
          AccessRequirement: {
            accessibility: 'Free'
          }
        },
        note: 'Attribution-on-share is not typed yet; created an open (Free) access rule as the Commons stand-in.'
      };
    case 'quota_extraction':
      return {
        rule_data: {
          UsageLimit: {
            max_quantity_per_period: 100,
            period_days: 30
          }
        }
      };
    case 'capacity_limit':
      return {
        rule_data: {
          UsageLimit: {
            max_concurrent_users: opts?.maxConcurrentUsers ?? 4
          }
        }
      };
    case 'max_per_agent':
      return {
        rule_data: {
          UsageLimit: {
            max_per_agent: opts?.maxPerAgent ?? 10
          }
        }
      };
    case 'maintenance_schedule':
      return {
        rule_data: {
          MaintenanceSchedule: {
            interval_days: 30,
            required_role: 'Repair'
          }
        },
        enforced_by: 'PrimaryAccountableAgent'
      };
    case 'no_ownership_transfer':
      // Ownership TransferCondition is Hard-rejected on Nondominium.
      // Custody + validation is the enforceable stand-in.
      return {
        rule_data: {
          TransferCondition: {
            transfer_type: 'Custody',
            requires_validation: true,
            validator_role: 'AccountableAgent'
          }
        },
        enforced_by: 'AccountableAgent',
        note: 'Ownership transfer is regime-blocked; created a custody-transfer validation rule instead.'
      };
    default:
      return null;
  }
}

/**
 * Narrow hApp's 7 regimes to the 4-regime DS recommendation matrix.
 */
export function regimeForTemplateRecommendations(regime: string | null | undefined): string {
  switch (regime) {
    case 'Pool':
      return 'CommonPool';
    case 'Collective':
      return 'Commons';
    case 'Public':
      return 'Commons';
    case 'Private':
    case 'Commons':
    case 'Nondominium':
    case 'CommonPool':
      return regime;
    default:
      return 'Commons';
  }
}

function ruleDiscriminant(ruleData: RuleData): string | null {
  const key = Object.keys(ruleData)[0];
  return key ?? null;
}

function rulePayload(ruleData: RuleData): Record<string, unknown> {
  const key = ruleDiscriminant(ruleData);
  if (!key) return {};
  const payload = (ruleData as unknown as Record<string, unknown>)[key];
  if (payload && typeof payload === 'object') {
    return payload as Record<string, unknown>;
  }
  return {};
}

/**
 * Whether an existing on-chain rule already covers this template.
 * Matches by RuleData variant + the template's identifying fields (not exact
 * numeric equality), so a customized capacity still blocks re-applying
 * capacity_limit.
 */
export function ruleMatchesTemplate(ruleData: RuleData, templateId: string): boolean {
  const mapped = mapTemplateToRuleData(templateId);
  if (!mapped) return false;

  const existingKind = ruleDiscriminant(ruleData);
  const templateKind = ruleDiscriminant(mapped.rule_data);
  if (!existingKind || existingKind !== templateKind) return false;

  const existing = rulePayload(ruleData);
  const template = rulePayload(mapped.rule_data);

  switch (templateId) {
    case 'access_accountable':
      return (
        existing.accessibility === template.accessibility &&
        existing.required_role === template.required_role
      );
    case 'access_attribution':
      return existing.accessibility === template.accessibility;
    case 'quota_extraction':
      return existing.max_quantity_per_period != null;
    case 'capacity_limit':
      return existing.max_concurrent_users != null;
    case 'max_per_agent':
      return existing.max_per_agent != null;
    case 'maintenance_schedule':
      return existing.interval_days != null;
    case 'no_ownership_transfer':
      return existing.transfer_type === template.transfer_type;
    default:
      return false;
  }
}

/** Template ids already represented by existing governance rules. */
export function appliedTemplateIdsFromRules(rules: Iterable<RuleData>): string[] {
  const applied: string[] = [];
  for (const id of CREATABLE_TEMPLATE_IDS) {
    for (const rule of rules) {
      if (ruleMatchesTemplate(rule, id)) {
        applied.push(id);
        break;
      }
    }
  }
  return applied;
}
