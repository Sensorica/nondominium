import { describe, it, expect } from 'vitest';
import type { NdoDescriptor } from '@nondominium/shared-types';
import { applyFilters, type ActiveFilters } from './ndo-filters';

const ndo = (
  hash: string,
  lifecycle_stage: string | null,
  resource_nature: string | null,
  property_regime: string | null
): NdoDescriptor => ({
  hash,
  name: hash,
  lifecycle_stage,
  property_regime,
  resource_nature,
  description: null,
  initiator: null,
  created_at: null,
  successor_ndo_hash: null,
  hibernation_origin: null,
  rivalry_override: null
});

const ALL = [
  ndo('a', 'Ideation', 'Physical', 'Commons'),
  ndo('b', 'Active', 'Digital', 'Commons'),
  ndo('c', 'Active', 'Physical', 'Private'),
  ndo('d', null, null, null)
];

const none: ActiveFilters = { stages: [], natures: [], regimes: [] };
const hashes = (f: Partial<ActiveFilters>) => applyFilters(ALL, { ...none, ...f }).map((d) => d.hash);

describe('applyFilters', () => {
  it('empty filters return every NDO, including those with null fields', () => {
    expect(applyFilters(ALL, none)).toBe(ALL);
  });

  it('values within one group are ORed', () => {
    expect(hashes({ stages: ['Ideation', 'Active'] })).toEqual(['a', 'b', 'c']);
    expect(hashes({ natures: ['Digital', 'Physical'] })).toEqual(['a', 'b', 'c']);
  });

  it('groups are ANDed', () => {
    expect(hashes({ stages: ['Active'], natures: ['Physical'] })).toEqual(['c']);
    expect(hashes({ stages: ['Active'], regimes: ['Commons'] })).toEqual(['b']);
    expect(hashes({ stages: ['Ideation'], natures: ['Digital'] })).toEqual([]);
  });

  it('a null field never matches an active group', () => {
    expect(hashes({ regimes: ['Commons', 'Private'] })).toEqual(['a', 'b', 'c']);
  });
});
