import type { LifecycleStage, NdoDescriptor } from '@nondominium/shared-types';

/**
 * Lifecycle stages an NDO may advance to, as the UI offers them.
 *
 * Hibernating is reachable only from Active here; the zome allows it from any non-terminal
 * stage. That gap is tracked for #147 and deliberately not changed by this table.
 */
export const LIFECYCLE_TRANSITIONS: Readonly<Record<string, readonly LifecycleStage[]>> = {
  Ideation: ['Specification', 'Deprecated', 'EndOfLife'],
  Specification: ['Development', 'Deprecated', 'EndOfLife'],
  Development: ['Prototype', 'Deprecated', 'EndOfLife'],
  Prototype: ['Stable', 'Deprecated', 'EndOfLife'],
  Stable: ['Distributed', 'Deprecated', 'EndOfLife'],
  Distributed: ['Active', 'Deprecated', 'EndOfLife'],
  Active: ['Hibernating', 'Deprecated', 'EndOfLife'],
  Hibernating: ['Deprecated', 'EndOfLife'],
  Deprecated: ['EndOfLife']
};

/** Next stages for a descriptor; a Hibernating NDO may also return to its `hibernation_origin`. */
export function allowedNextStages(
  descriptor: Pick<NdoDescriptor, 'lifecycle_stage' | 'hibernation_origin'>
): LifecycleStage[] {
  const allowed = [...(LIFECYCLE_TRANSITIONS[descriptor.lifecycle_stage ?? ''] ?? [])];
  return descriptor.lifecycle_stage === 'Hibernating' && descriptor.hibernation_origin
    ? [descriptor.hibernation_origin as LifecycleStage, ...allowed]
    : allowed;
}
