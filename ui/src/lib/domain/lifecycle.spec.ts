import { describe, it, expect } from 'vitest';
import type { LifecycleStage } from '@nondominium/shared-types';
import { LIFECYCLE_TRANSITIONS, allowedNextStages } from './lifecycle';

// The table exactly as it was inlined in LifecycleTransitionModal.svelte before the move.
const INLINE_TABLE: Record<string, LifecycleStage[]> = {
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

const STAGES: LifecycleStage[] = [
  'Ideation',
  'Specification',
  'Development',
  'Prototype',
  'Stable',
  'Distributed',
  'Active',
  'Hibernating',
  'Deprecated',
  'EndOfLife'
];

const at = (lifecycle_stage: string | null, hibernation_origin: string | null = null) => ({
  lifecycle_stage,
  hibernation_origin
});

describe('lifecycle transitions', () => {
  it('the table matches the one previously inlined in the modal', () => {
    expect(LIFECYCLE_TRANSITIONS).toEqual(INLINE_TABLE);
  });

  it.each(STAGES)('allowedNextStages from %s matches the inline table', (stage) => {
    expect(allowedNextStages(at(stage))).toEqual(INLINE_TABLE[stage] ?? []);
  });

  it('EndOfLife is terminal', () => {
    expect(allowedNextStages(at('EndOfLife'))).toEqual([]);
  });

  it('Hibernating is reachable only from Active', () => {
    const from = STAGES.filter((s) => allowedNextStages(at(s)).includes('Hibernating'));
    expect(from).toEqual(['Active']);
  });

  it('a Hibernating NDO may return to its hibernation_origin first', () => {
    expect(allowedNextStages(at('Hibernating', 'Active'))).toEqual(['Active', 'Deprecated', 'EndOfLife']);
  });

  it('the return path is offered only when Hibernating', () => {
    expect(allowedNextStages(at('Active', 'Stable'))).toEqual(INLINE_TABLE.Active);
  });

  it('a missing or unknown stage offers nothing', () => {
    expect(allowedNextStages(at(null))).toEqual([]);
    expect(allowedNextStages(at('Unknown'))).toEqual([]);
  });

  it('returns a fresh array, so callers cannot mutate the table', () => {
    allowedNextStages(at('Ideation')).push('Active');
    expect(LIFECYCLE_TRANSITIONS.Ideation).toEqual(INLINE_TABLE.Ideation);
  });
});
