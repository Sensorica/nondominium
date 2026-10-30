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
  'quota_extraction',
  'maintenance_schedule',
  'no_ownership_transfer'
]);

/**
 * Map a DS template id to RuleData. Returns null for templates that need schema
 * work (attribution, integrity, capacity, Source-*).
 */
export function mapTemplateToRuleData(templateId: string): TemplateCreateResult | null {
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
    case 'quota_extraction':
      return {
        rule_data: {
          UsageLimit: {
            max_quantity_per_period: 100,
            period_days: 30
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
