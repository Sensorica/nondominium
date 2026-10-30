/**
 * Adapters between hApp `@nondominium/shared-types` and design-system
 * `@nondominium/ndo-ui` domain types. Shapes are close; PropertyRegime width
 * and optional foreshadow fields differ.
 */
import type { GroupDescriptor, NdoDescriptor, NdoInput } from '@nondominium/shared-types';
import type {
  GroupDescriptor as NdoUiGroup,
  NdoDescriptor as NdoUiNdo,
  NdoInput as NdoUiNdoInput,
  PropertyRegime as NdoUiRegime
} from '@nondominium/ndo-ui';

const NDO_UI_REGIMES = new Set<string>(['Private', 'Commons', 'Nondominium', 'CommonPool']);

/** Cast hApp descriptors for ndo-ui presentational components (NdoBrowser, ResourcePerspective). */
export function toNdoUiDescriptors(ndos: NdoDescriptor[]): NdoUiNdo[] {
  return ndos as unknown as NdoUiNdo[];
}

export function toNdoUiGroups(groups: GroupDescriptor[]): NdoUiGroup[] {
  return groups.map((g) => ({
    id: g.id,
    name: g.name,
    createdBy: g.createdBy,
    createdAt: g.createdAt,
    ndoHashes: g.ndoHashes,
    memberProfile: g.memberProfile
  }));
}

/** Map wizard NdoInput onto the hApp create payload; drop Source / foreshadow fields. */
export function fromNdoUiCreateInput(input: NdoUiNdoInput): NdoInput {
  const regime = NDO_UI_REGIMES.has(input.property_regime)
    ? (input.property_regime as NdoInput['property_regime'])
    : (input.property_regime as NdoInput['property_regime']);
  return {
    name: input.name,
    property_regime: regime,
    resource_nature: input.resource_nature as NdoInput['resource_nature'],
    lifecycle_stage: input.lifecycle_stage as NdoInput['lifecycle_stage'],
    ...(input.description?.trim() ? { description: input.description.trim() } : {})
  };
}

export function isNdoUiRegime(value: string): value is NdoUiRegime {
  return NDO_UI_REGIMES.has(value);
}
