import { Context, Effect as E, Layer, pipe } from 'effect';
import type { ActionHash } from '@holochain/client';
import { decodeHashFromBase64, encodeHashToBase64 } from '@holochain/client';
import type {
  NdoDescriptor,
  NdoOutput,
  NondominiumIdentity,
  NdoInput,
  UpdateLifecycleStageInput,
  NdoTransitionHistoryEvent
} from '@nondominium/shared-types';
import { NdoNotFoundError, NdoNotImplementedError } from '$lib/errors/ndo.errors';
import { ResourceError } from '$lib/errors/resource.errors';
import {
  ResourceServiceTag,
  ResourceServiceResolved,
  type ResourceService
} from './resource.service';
import { LobbyServiceTag, LobbyServiceResolved } from './lobby.service';
import { GroupServiceTag, GroupServiceResolved } from './group.service';

export interface NdoService {
  getLobbyNdoDescriptors: () => E.Effect<NdoDescriptor[], ResourceError>;
  getNdoDescriptorForSpecActionHash: (
    hash: ActionHash
  ) => E.Effect<NdoDescriptor, ResourceError | NdoNotFoundError>;
  createNdo: (input: NdoInput, groupId: string) => E.Effect<ActionHash, ResourceError>;
  updateLifecycleStage: (input: UpdateLifecycleStageInput) => E.Effect<ActionHash, ResourceError>;
  getNdoTransitionHistory: (ndoHash: ActionHash) => E.Effect<NdoTransitionHistoryEvent[], ResourceError>;
  getGroupNdoDescriptors: (groupId: string) => E.Effect<NdoDescriptor[], ResourceError>;
  getAssociatedGroupIds: (ndoHashB64: string) => E.Effect<string[], ResourceError>;
  joinNdo: (ndoHashB64: string) => E.Effect<void, NdoNotImplementedError>;
  getNdoMembers: (ndoHashB64: string) => E.Effect<{ id: string; name: string }[], NdoNotImplementedError>;
}

export class NdoServiceTag extends Context.Tag('NdoService')<NdoServiceTag, NdoService>() { }

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

function ndoOutputToIdentityDescriptor(ndo: NdoOutput): NdoDescriptor {
  return {
    hash: encodeHashToBase64(ndo.action_hash),
    name: ndo.entry.name,
    ...ndoToDescriptorFields(ndo.entry)
  };
}

function identityToDescriptor(hash: ActionHash, entry: NondominiumIdentity): NdoDescriptor {
  return {
    hash: encodeHashToBase64(hash),
    name: entry.name,
    ...ndoToDescriptorFields(entry)
  };
}

const mapListingToDescriptor = (
  listing: { action_hash: ActionHash; specification: { name: string } },
  ndoByName: Map<string, NondominiumIdentity>
): NdoDescriptor => {
  const entry = ndoByName.get(listing.specification.name);
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
  return {
    hash: encodeHashToBase64(listing.action_hash),
    name: listing.specification.name,
    ...(entry ? ndoToDescriptorFields(entry) : NULL_NDO_FIELDS)
  };
};

const NdoServiceDepsResolved = Layer.mergeAll(
  ResourceServiceResolved,
  LobbyServiceResolved,
  GroupServiceResolved
);

export const NdoServiceLive: Layer.Layer<
  NdoServiceTag,
  never,
  ResourceServiceTag | LobbyServiceTag | GroupServiceTag
> = Layer.effect(
  NdoServiceTag,
  E.gen(function* () {
    const resource = yield* ResourceServiceTag;
    const lobby = yield* LobbyServiceTag;
    const groupService = yield* GroupServiceTag;

    const resolveNdoDescriptor = (
      hashB64: string
    ): E.Effect<NdoDescriptor | null, ResourceError> =>
      E.gen(function* () {
        const hash = decodeHashFromBase64(hashB64) as ActionHash;
        const entry = yield* resource.getNdo(hash);
        if (entry) return identityToDescriptor(hash, entry);

        const myNdosOut = yield* resource.getMyNdos().pipe(
          E.catchAll(() => E.succeed({ ndos: [] as NdoOutput[] }))
        );
        const myNdo = myNdosOut.ndos.find(
          (n) => encodeHashToBase64(n.action_hash) === hashB64
        );
        if (myNdo) return ndoOutputToIdentityDescriptor(myNdo);

        const [listings, ndosOut] = yield* E.all(
          [resource.getAllResourceSpecifications(), resource.getAllNdos()],
          { concurrency: 'unbounded' }
        );
        const ndoByName = new Map(ndosOut.ndos.map((n) => [n.entry.name, n.entry]));
        const foundSpec = listings.find((l) => encodeHashToBase64(l.action_hash) === hashB64);
        if (foundSpec) return mapListingToDescriptor(foundSpec, ndoByName);

        const foundNdo = ndosOut.ndos.find(
          (n) => encodeHashToBase64(n.action_hash) === hashB64
        );
        if (foundNdo) return ndoOutputToIdentityDescriptor(foundNdo);
        return null;
      });

    const collectSoftLinkHashes = (): E.Effect<Map<string, Set<string>>, ResourceError> =>
      E.gen(function* () {
        const groups = yield* lobby.getMyGroups().pipe(
          E.catchAll(() => E.succeed([]))
        );
        const groupToHashes = new Map<string, Set<string>>();
        for (const g of groups) {
          const cell = yield* lobby.getGroupCell(g.id).pipe(E.catchAll(() => E.succeed(null)));
          if (!cell) continue;
          const hashes = yield* groupService.getSoftLinkTargetHashes(cell.cellId).pipe(
            E.catchAll(() => E.succeed([] as string[]))
          );
          groupToHashes.set(g.id, new Set(hashes));
        }
        return groupToHashes;
      });

    return {
      getLobbyNdoDescriptors: () =>
        E.gen(function* () {
          const groupToHashes = yield* collectSoftLinkHashes();
          const allHashes = new Set<string>();
          for (const hashes of groupToHashes.values()) {
            for (const h of hashes) allHashes.add(h);
          }
          if (allHashes.size === 0) return [];

          const descriptors: NdoDescriptor[] = [];
          const seen = new Set<string>();
          for (const hb64 of allHashes) {
            if (seen.has(hb64)) continue;
            const d = yield* resolveNdoDescriptor(hb64).pipe(E.catchAll(() => E.succeed(null)));
            if (d) {
              seen.add(hb64);
              descriptors.push(d);
            }
          }
          return descriptors;
        }),

      getNdoDescriptorForSpecActionHash: (hash) =>
        E.gen(function* () {
          const hashB64 = encodeHashToBase64(hash);
          const entry = yield* resource.getNdo(hash);
          if (entry) return identityToDescriptor(hash, entry);

          const resolved = yield* resolveNdoDescriptor(hashB64);
          if (resolved) return resolved;

          return yield* E.fail(new NdoNotFoundError({ hash: hashB64 }));
        }),

      createNdo: (input, groupId) =>
        E.gen(function* () {
          const ndoOut = yield* resource.createNdo(input);
          const hashB64 = encodeHashToBase64(ndoOut.action_hash);

          const cell = yield* lobby.getGroupCell(groupId).pipe(
            E.catchAll(() => E.succeed(null))
          );
          const group = (yield* lobby.getMyGroups().pipe(E.catchAll(() => E.succeed([])))).find(
            (g) => g.id === groupId
          );

          if (cell && group?.groupHash) {
            yield* groupService
              .createSoftLink(
                cell.cellId,
                group.groupHash,
                hashB64,
                input.description ?? input.name
              )
              .pipe(E.catchAll(() => E.void));
          }

          return ndoOut.action_hash;
        }),

      updateLifecycleStage: (input) => resource.updateLifecycleStage(input),

      getNdoTransitionHistory: (ndoHash) => resource.getNdoTransitionHistory(ndoHash),

      getGroupNdoDescriptors: (groupId) =>
        E.gen(function* () {
          const cell = yield* lobby.getGroupCell(groupId).pipe(
            E.catchAll(() => E.succeed(null))
          );
          if (!cell) return [];

          const hashes = yield* groupService.getSoftLinkTargetHashes(cell.cellId).pipe(
            E.catchAll(() => E.succeed([] as string[]))
          );
          if (hashes.length === 0) return [];

          const descriptors: NdoDescriptor[] = [];
          for (const hb64 of hashes) {
            const d = yield* resolveNdoDescriptor(hb64).pipe(E.catchAll(() => E.succeed(null)));
            if (d) descriptors.push(d);
          }
          return descriptors;
        }),

      getAssociatedGroupIds: (ndoHashB64) =>
        E.gen(function* () {
          const groupToHashes = yield* collectSoftLinkHashes();
          const associated: string[] = [];
          for (const [groupId, hashes] of groupToHashes) {
            if (hashes.has(ndoHashB64)) associated.push(groupId);
          }
          return associated;
        }),

      joinNdo: () =>
        E.fail(
          new NdoNotImplementedError({
            feature: 'join_ndo',
            message:
              'NDO membership is not yet implemented on the DHT. See documentation/zomes/resource_zome.md § NDO membership (planned).'
          })
        ),

      getNdoMembers: () =>
        E.fail(
          new NdoNotImplementedError({
            feature: 'get_ndo_members',
            message:
              'NDO member listing is not yet implemented on the DHT. See documentation/zomes/resource_zome.md § NDO membership (planned).'
          })
        )
    } satisfies NdoService;
  })
);

export const NdoServiceResolved: Layer.Layer<NdoServiceTag> = NdoServiceLive.pipe(
  Layer.provide(NdoServiceDepsResolved)
);
