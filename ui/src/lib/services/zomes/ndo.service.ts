import { Context, Effect as E, Layer, pipe } from 'effect';
import type { ActionHash } from '@holochain/client';
import { decodeHashFromBase64, encodeHashToBase64 } from '@holochain/client';
import type {
  NdoAnchorStub,
  NdoDescriptor,
  NdoOutput,
  NondominiumIdentity,
  NdoInput,
  UpdateLifecycleStageInput,
  NdoTransitionHistoryEvent
} from '@nondominium/shared-types';
import { NdoNotFoundError, NdoNotImplementedError } from '$lib/errors/ndo.errors';
import { ResourceError } from '$lib/errors/resource.errors';
import { GROUP_CONTEXTS } from '$lib/errors/error-contexts';
import { ndoCellProperties } from '../cell.manager';
import { generateNdoNetworkSeed } from '../group-clone.helpers';
import {
  HolochainClientServiceTag,
  HolochainClientServiceLive
} from '../holochain.service.svelte';
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

/** Anchor cache → browsable descriptor. Browsing never requires joining NDO cells. */
function anchorToDescriptor(anchor: NdoAnchorStub): NdoDescriptor {
  return {
    hash: anchor.identityActionHashB64,
    name: anchor.name,
    lifecycle_stage: anchor.lifecycleStage,
    property_regime: anchor.propertyRegime,
    resource_nature: anchor.resourceNature,
    description: anchor.description,
    initiator: anchor.initiatorB64,
    created_at: anchor.ndoCreatedAt,
    successor_ndo_hash: null,
    hibernation_origin: null,
    source: 'anchor',
    ndoDnaHashB64: anchor.ndoDnaHashB64,
    networkSeed: anchor.networkSeed
  };
}

const NdoServiceDepsResolved = Layer.mergeAll(
  ResourceServiceResolved,
  LobbyServiceResolved,
  GroupServiceResolved,
  HolochainClientServiceLive
);

export const NdoServiceLive: Layer.Layer<
  NdoServiceTag,
  never,
  ResourceServiceTag | LobbyServiceTag | GroupServiceTag | HolochainClientServiceTag
> = Layer.effect(
  NdoServiceTag,
  E.gen(function* () {
    const resource = yield* ResourceServiceTag;
    const lobby = yield* LobbyServiceTag;
    const groupService = yield* GroupServiceTag;
    const holochainClient = yield* HolochainClientServiceTag;

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

    const collectAnchors = (): E.Effect<NdoAnchorStub[], ResourceError> =>
      E.gen(function* () {
        const groups = yield* lobby.getMyGroups().pipe(E.catchAll(() => E.succeed([])));
        const anchors: NdoAnchorStub[] = [];
        for (const g of groups) {
          const cell = yield* lobby.getGroupCell(g.id).pipe(E.catchAll(() => E.succeed(null)));
          if (!cell) continue;
          const groupAnchors = yield* groupService.getNdoAnchors(cell.cellId).pipe(
            E.catchAll(() => E.succeed([] as NdoAnchorStub[]))
          );
          anchors.push(...groupAnchors);
        }
        return anchors;
      });

    return {
      getLobbyNdoDescriptors: () =>
        E.gen(function* () {
          // Anchors are authoritative (NDO-per-cell, #112); SoftLinks remain as
          // planning-level references and legacy shared-DHT associations.
          const anchors = yield* collectAnchors().pipe(E.catchAll(() => E.succeed([])));
          const descriptors: NdoDescriptor[] = [];
          const seen = new Set<string>();
          for (const anchor of anchors) {
            if (seen.has(anchor.identityActionHashB64)) continue;
            seen.add(anchor.identityActionHashB64);
            descriptors.push(anchorToDescriptor(anchor));
          }

          const groupToHashes = yield* collectSoftLinkHashes();
          const allHashes = new Set<string>();
          for (const hashes of groupToHashes.values()) {
            for (const h of hashes) allHashes.add(h);
          }
          for (const hb64 of allHashes) {
            if (seen.has(hb64)) continue;
            const d = yield* resolveNdoDescriptor(hb64).pipe(E.catchAll(() => E.succeed(null)));
            if (d) {
              seen.add(hb64);
              descriptors.push({ ...d, source: d.source ?? 'softlink' });
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

          // Cell-based NDOs (#112) do not exist on the shared DHT: resolve deep
          // links from the group anchors' cached descriptors instead.
          const anchors = yield* collectAnchors().pipe(E.catchAll(() => E.succeed([])));
          const anchored = anchors.find((a) => a.identityActionHashB64 === hashB64);
          if (anchored) return anchorToDescriptor(anchored);

          return yield* E.fail(new NdoNotFoundError({ hash: hashB64 }));
        }),

      createNdo: (input, groupId) =>
        E.gen(function* () {
          // NDO-per-cell flow (#110 section 5 amended, #112): provision a cloned
          // NDO cell whose DNA properties carry the immutable Layer 0 fields, write
          // the genesis NondominiumIdentity inside it, then anchor it in the group
          // cell. The clone's DnaHash is the NDO's permanent identity (ADR-010).
          const networkSeed = generateNdoNetworkSeed();

          const { cloned, initiator, propertiesCreatedAt } = yield* E.tryPromise({
            try: async () => {
              if (!holochainClient.isConnected) await holochainClient.connectClient();
              const initiator = (await holochainClient.getMyAgentPubKey()) as Uint8Array;
              const propertiesCreatedAt = Date.now() * 1000;
              const properties = ndoCellProperties(
                input.name,
                initiator,
                input.property_regime,
                input.resource_nature,
                propertiesCreatedAt
              );
              const cloned = await holochainClient.createNdoCloneCell(networkSeed, properties);
              return { cloned, initiator, propertiesCreatedAt };
            },
            catch: (error) => ResourceError.fromError(error, GROUP_CONTEXTS.CREATE_NDO_CELL)
          });

          // Genesis identity inside the NDO cell (existing zome_resource code path).
          const ndoOut = yield* E.tryPromise({
            try: () =>
              holochainClient.callZome(
                'zome_resource',
                'create_ndo',
                input,
                undefined,
                undefined,
                cloned.cell_id
              ) as Promise<NdoOutput>,
            catch: (error) => ResourceError.fromError(error, GROUP_CONTEXTS.CREATE_NDO_CELL)
          });

          // Anchor in the group cell — the authoritative group-to-NDO pointer.
          // Best-effort like the former SoftLink write: the NDO cell exists even
          // if anchoring fails; re-anchoring is possible from the NDO cell data.
          const cell = yield* lobby.getGroupCell(groupId).pipe(
            E.catchAll(() => E.succeed(null))
          );
          const group = (yield* lobby.getMyGroups().pipe(E.catchAll(() => E.succeed([])))).find(
            (g) => g.id === groupId
          );

          if (cell && group?.groupHash) {
            yield* groupService
              .createNdoAnchor(cell.cellId, {
                groupHashB64: group.groupHash,
                name: input.name,
                description: input.description ?? null,
                ndoDnaHashB64: encodeHashToBase64(cloned.cell_id[0]),
                networkSeed,
                identityActionHashB64: encodeHashToBase64(ndoOut.action_hash),
                initiatorB64: encodeHashToBase64(initiator),
                // The DNA property input, NOT the genesis entry's sys_time: joiners
                // reconstruct the clone properties from this value (pinning check).
                ndoCreatedAt: propertiesCreatedAt,
                lifecycleStage: String(input.lifecycle_stage),
                propertyRegime: String(input.property_regime),
                resourceNature: String(input.resource_nature)
              })
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

          // Anchors render directly from their cached descriptor fields — no
          // per-NDO round trip, no NDO cell join required (#112, ADR-011).
          const anchors = yield* groupService.getNdoAnchors(cell.cellId).pipe(
            E.catchAll(() => E.succeed([] as NdoAnchorStub[]))
          );
          const descriptors: NdoDescriptor[] = [];
          const seen = new Set<string>();
          for (const anchor of anchors) {
            if (seen.has(anchor.identityActionHashB64)) continue;
            seen.add(anchor.identityActionHashB64);
            descriptors.push(anchorToDescriptor(anchor));
          }

          // SoftLinks stay as planning-level references (dashed cards).
          const hashes = yield* groupService.getSoftLinkTargetHashes(cell.cellId).pipe(
            E.catchAll(() => E.succeed([] as string[]))
          );
          for (const hb64 of hashes) {
            if (seen.has(hb64)) continue;
            const d = yield* resolveNdoDescriptor(hb64).pipe(E.catchAll(() => E.succeed(null)));
            if (d) {
              seen.add(hb64);
              descriptors.push({ ...d, source: d.source ?? 'softlink' });
            }
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
