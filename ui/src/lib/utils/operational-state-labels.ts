import type { OperationalState } from '@nondominium/shared-types';

const LABELS: Record<OperationalState, string> = {
  Available: 'Available',
  Reserved: 'Reserved',
  InTransit: 'In transit',
  InStorage: 'In storage',
  InMaintenance: 'In maintenance',
  InUse: 'In use',
  PendingValidation: 'Pending validation'
};

/** Human-readable label for an EconomicResource operational_state value. */
export function operationalStateLabel(state: OperationalState | string): string {
  if (state in LABELS) {
    return LABELS[state as OperationalState];
  }
  return state;
}
