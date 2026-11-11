/**
 * hApp adapter: build `deriveNdoUiProfile` input from shared-types NDO fields.
 */
import {
  deriveNdoUiProfile,
  type NdoUiProfile,
  type NdoUiProfileInput
} from '@nondominium/ndo-ui';
import type { EconomicMode, NdoDescriptor, UseKind } from '@nondominium/shared-types';

export type HappProfileOpts = {
  descriptor?: Pick<
    NdoDescriptor,
    'resource_nature' | 'property_regime' | 'economic_mode' | 'use_kind' | 'ndo_archetype' | 'source_profile'
  > | null;
  resourceNature?: string | null;
  propertyRegime?: string | null;
  economicMode?: EconomicMode | string | null;
  useKind?: UseKind | string | null;
  isSource?: boolean;
  existingSpecCount?: number;
  hasInventoriableResource?: boolean;
  maxConcurrentUsers?: number | null;
  creatableRuleIds?: readonly string[] | Set<string> | null;
  appliedRuleIds?: readonly string[] | Set<string> | null;
};

export function happNdoUiProfile(opts: HappProfileOpts): NdoUiProfile {
  const d = opts.descriptor;
  const isSource =
    opts.isSource ??
    (d?.ndo_archetype === 'source_ndo' ||
      (d?.property_regime === 'Nondominium' && !!d?.source_profile));

  const input: NdoUiProfileInput = {
    resourceNature: opts.resourceNature ?? d?.resource_nature ?? null,
    propertyRegime: opts.propertyRegime ?? d?.property_regime ?? null,
    economicMode: (opts.economicMode ?? d?.economic_mode ?? null) as string | null,
    useKind: (opts.useKind ?? d?.use_kind ?? null) as string | null,
    isSource,
    existingSpecCount: opts.existingSpecCount,
    hasInventoriableResource: opts.hasInventoriableResource,
    maxConcurrentUsers: opts.maxConcurrentUsers ?? null,
    creatableRuleIds: opts.creatableRuleIds,
    appliedRuleIds: opts.appliedRuleIds
  };
  return deriveNdoUiProfile(input);
}
