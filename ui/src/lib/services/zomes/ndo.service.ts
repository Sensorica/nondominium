import { Context, Effect as E, Layer, pipe } from 'effect';
import type { ActionHash } from '@holochain/client';
import { encodeHashToBase64 } from '@holochain/client';
import type { NdoDescriptor, NdoOutput, NondominiumIdentity } from '@nondominium/shared-types';
import { NdoNotFoundError } from '$lib/errors/ndo.errors';
import { ResourceError } from '$lib/errors/resource.errors';
import {
  ResourceServiceTag,
  ResourceServiceResolved,
  type ResourceService
} from './resource.service';

export interface NdoService {
  getLobbyNdoDescriptors: () => E.Effect<NdoDescriptor[], ResourceError>;
  getNdoDescriptorForSpecActionHash: (
    hash: ActionHash
  ) => E.Effect<NdoDescriptor, ResourceError | NdoNotFoundError>;
}

export class NdoServiceTag extends Context.Tag('NdoService')<NdoServiceTag, NdoService>() {}

function ndoToDescriptorFields(
  entry: NondominiumIdentity
): Omit<NdoDescriptor, 'hash' | 'name'> {
  return {
    lifecycle_stage: String(entry.lifecycle_stage),
    property_regime: String(entry.property_regime),
    resource_nature: String(entry.resource_nature),
    description: entry.description ?? null,
    initiator: encodeHashToBase64(entry.initiator),
    created_at: Number(entry.created_at),
    successor_ndo_hash: entry.successor_ndo_hash
      ? encodeHashToBase64(entry.successor_ndo_hash)
      : null,
    hibernation_origin: entry.hibernation_origin ? String(entry.hibernation_origin) : null
  };
}

const NULL_NDO_FIELDS: Omit<NdoDescriptor, 'hash' | 'name'> = {
  lifecycle_stage: null,
  property_regime: null,
  resource_nature: null,
  description: null,
  initiator: null,
  created_at: null,
  successor_ndo_hash: null,
  hibernation_origin: null
};

function mapListingToDescriptor(
  listing: { action_hash: ActionHash; specification: { name: string } },
  ndoByName: Map<string, NondominiumIdentity>
): NdoDescriptor {
  const entry = ndoByName.get(listing.specification.name);
  return {
    hash: encodeHashToBase64(listing.action_hash),
    name: listing.specification.name,
    ...(entry ? ndoToDescriptorFields(entry) : NULL_NDO_FIELDS)
  };
}

const lobbyDescriptors = (
  resource: ResourceService
): E.Effect<NdoDescriptor[], ResourceError> =>
  pipe(
    E.all([resource.getAllResourceSpecifications(), resource.getAllNdos()], {
      concurrency: 'unbounded'
    }),
    E.map(([listings, ndosOut]) => {
      const ndoByName = new Map<string, NondominiumIdentity>(
        ndosOut.ndos.map((n) => [n.entry.name, n.entry])
      );
      return listings.map((listing) => mapListingToDescriptor(listing, ndoByName));
    })
  );

export const NdoServiceLive: Layer.Layer<NdoServiceTag, never, ResourceServiceTag> = Layer.effect(
  NdoServiceTag,
  E.gen(function* () {
    const resource = yield* ResourceServiceTag;
    return {
      getLobbyNdoDescriptors: () => lobbyDescriptors(resource),
      getNdoDescriptorForSpecActionHash: (hash) =>
        E.gen(function* () {
          const listings = yield* resource.getAllResourceSpecifications();
          const found = listings.find((l) => l.action_hash.toString() === hash.toString());
          if (!found) {
            return yield* E.fail(new NdoNotFoundError({ hash: encodeHashToBase64(hash) }));
          }
          const ndosOut = yield* resource.getAllNdos();
          const ndoByName = new Map<string, NondominiumIdentity>(
            ndosOut.ndos.map((n: NdoOutput) => [n.entry.name, n.entry])
          );
          return mapListingToDescriptor(found, ndoByName);
        })
    } satisfies NdoService;
  })
);

export const NdoServiceResolved: Layer.Layer<NdoServiceTag> = NdoServiceLive.pipe(
  Layer.provide(ResourceServiceResolved)
);
