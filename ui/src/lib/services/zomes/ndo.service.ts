import { Context, Effect as E, Layer, pipe } from 'effect';
import type { ActionHash } from '@holochain/client';
import { encodeHashToBase64 } from '@holochain/client';
import type { NdoDescriptor, NdoOutput } from '@nondominium/shared-types';
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

function mapListingToDescriptor(
  listing: { action_hash: ActionHash; specification: { name: string; is_active?: boolean; category?: string } },
  ndoByName: Map<string, { property_regime: string; lifecycle_stage: string }>
): NdoDescriptor {
  const ndo = ndoByName.get(listing.specification.name);
  const lifecycleStage =
    ndo?.lifecycle_stage ??
    (listing.specification.is_active === false ? 'EndOfLife' : 'Ideation');
  const propertyRegime =
    ndo?.property_regime ?? listing.specification.category ?? 'Planning';
  return {
    hash: encodeHashToBase64(listing.action_hash),
    name: listing.specification.name,
    lifecycle_stage: lifecycleStage,
    property_regime: propertyRegime
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
      const ndoByName = new Map(
        ndosOut.ndos.map((n) => [
          n.entry.name,
          {
            property_regime: String(n.entry.property_regime),
            lifecycle_stage: String(n.entry.lifecycle_stage)
          }
        ])
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
          const ndoByName = new Map<string, { property_regime: string; lifecycle_stage: string }>(
            ndosOut.ndos.map((n: NdoOutput) => [
              n.entry.name,
              {
                property_regime: String(n.entry.property_regime),
                lifecycle_stage: String(n.entry.lifecycle_stage)
              }
            ])
          );
          return mapListingToDescriptor(found, ndoByName);
        })
    } satisfies NdoService;
  })
);

export const NdoServiceResolved: Layer.Layer<NdoServiceTag> = NdoServiceLive.pipe(
  Layer.provide(ResourceServiceResolved)
);
