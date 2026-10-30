/**
 * Adapters between hApp `@nondominium/shared-types` and design-system
 * `@nondominium/ndo-ui` domain types. Shapes are close; PropertyRegime width
 * and optional foreshadow fields differ.
 */
import { encodeHashToBase64 } from '@holochain/client';
import type {
  GroupDescriptor,
  NdoDescriptor,
  NdoInput,
  ResourceSpecificationInput,
  ResourceSpecificationListing,
  ResourceScope
} from '@nondominium/shared-types';
import type {
  GroupDescriptor as NdoUiGroup,
  NdoDescriptor as NdoUiNdo,
  NdoInput as NdoUiNdoInput,
  PropertyRegime as NdoUiRegime,
  ResourceSpecification as NdoUiSpec,
  ResourceSpecificationInput as NdoUiSpecInput
} from '@nondominium/ndo-ui';

const NDO_UI_REGIMES = new Set<string>(['Private', 'Commons', 'Nondominium', 'CommonPool']);

/** Cast hApp descriptors for ndo-ui presentational components (NdoBrowser, ResourcePerspective). */
export function toNdoUiDescriptors(ndos: NdoDescriptor[]): NdoUiNdo[] {
  return ndos as unknown as NdoUiNdo[];
}

export function toNdoUiDescriptor(ndo: NdoDescriptor): NdoUiNdo {
  return ndo as unknown as NdoUiNdo;
}

/** Map DHT listings to ndo-ui ResourcesPanel rows (string hashes + foreshadow). */
export function toNdoUiSpecifications(
  listings: ResourceSpecificationListing[],
  opts?: { activatedAtStage?: string | null; author?: string }
): NdoUiSpec[] {
  return listings.map((listing) => {
    const s = listing.specification;
    return {
      action_hash: encodeHashToBase64(listing.action_hash),
      name: s.name,
      description: s.description ?? '',
      category: s.category ?? 'general',
      image_url: s.image_url ?? null,
      tags: s.tags ?? [],
      is_active: s.is_active !== false,
      scope: (s.scope ?? 'Project') as NdoUiSpec['scope'],
      ndo_identity_hash: s.ndo_identity_hash
        ? encodeHashToBase64(s.ndo_identity_hash)
        : '',
      activated_at_stage: opts?.activatedAtStage ?? 'Specification',
      author: opts?.author ?? '',
      created_at: 0,
      ...(s.inventory_intent != null && { inventory_intent: s.inventory_intent }),
      ...(s.identification_pattern !== undefined && {
        identification_pattern: s.identification_pattern ?? null
      }),
      ...(s.default_unit !== undefined && { default_unit: s.default_unit ?? null }),
      ...(s.substitutable !== undefined && { substitutable: s.substitutable ?? null }),
      ...(s.digital_locator_kind !== undefined && {
        digital_locator_kind: s.digital_locator_kind ?? null
      }),
      ...(s.digital_locator !== undefined && { digital_locator: s.digital_locator ?? null })
    };
  });
}

/** Map DS create/edit payload onto the hApp zome input (drops Source-only fields). */
export function fromNdoUiSpecInput(
  input: NdoUiSpecInput,
  ndoIdentityHash: ResourceSpecificationInput['ndo_identity_hash']
): ResourceSpecificationInput {
  return {
    name: input.name.trim(),
    description: input.description.trim(),
    category: (input.category ?? 'general').trim() || 'general',
    ...(input.image_url?.trim() ? { image_url: input.image_url.trim() } : {}),
    tags: input.tags ?? [],
    scope: input.scope as ResourceScope,
    ndo_identity_hash: ndoIdentityHash,
    governance_rules: [],
    ...(input.inventory_intent != null && { inventory_intent: input.inventory_intent }),
    ...(input.identification_pattern !== undefined && {
      identification_pattern: input.identification_pattern
    }),
    ...(input.default_unit !== undefined && { default_unit: input.default_unit }),
    ...(input.substitutable !== undefined && { substitutable: input.substitutable }),
    ...(input.digital_locator_kind !== undefined && {
      digital_locator_kind: input.digital_locator_kind
    }),
    ...(input.digital_locator !== undefined && { digital_locator: input.digital_locator })
  };
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
