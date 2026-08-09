import { Context, Effect as E, Layer } from 'effect';
import type { ActionHash, CellId } from '@holochain/client';
import { decodeHashFromBase64, encodeHashToBase64 } from '@holochain/client';
import type {
  NdoDescriptor,
  NdoOutput,
  NondominiumIdentity,
  NdoInput,
  NdoDnaProperties,
  NdoAnchorEntry,
  UpdateLifecycleStageInput,
  NdoTransitionHistoryEvent
} from '@nondominium/shared-types';
import { NdoNotFoundError, NdoNotImplementedError } from '$lib/errors/ndo.errors';
import { ResourceError } from '$lib/errors/resource.errors';
import {
  ResourceServiceTag,
  ResourceServiceResolved
} from './resource.service';
import { LobbyServiceTag, LobbyServiceResolved } from './lobby.service';
import { GroupServiceTag, GroupServiceResolved } from './group.service';
import {
  HolochainClientServiceTag,
  HolochainClientServiceLive
} from '../holochain.service.svelte';
import { generateNdoNetworkSeed } from '../ndo-clone.helpers';

// ─── Service interface ────────────────────────────────────────────────────────

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

export class NdoServiceTag extends Context.Tag('NdoService')<NdoServiceTag, NdoService>() {}

// ─── Descriptor builders ──────────────────────────────────────────────────────

/**
 * Card descriptor from an NdoAnchor's cached fields. The lean anchor does not
 * cache the mutable `successor_ndo_hash` / `hibernation_origin` entry fields;
 * those are populated from the live entry when the NDO is opened
 * (identityToDescriptor via the ndo cell).
 */
function anchorToDescriptor(anchor: NdoAnchorEntry): NdoDescriptor {
  return {
    hash: encodeHashToBase64(anchor.identity_action_hash),
    name: anchor.name,
    lifecycle_stage: anchor.lifecycle_stage,
    property_regime: anchor.property_regime,
    resource_nature: anchor.resource_nature,
    description: anchor.description,
    initiator: encodeHashToBase64(anchor.initiator),
    created_at: Number(anchor.ndo_created_at),
    successor_ndo_hash: null,
    hibernation_origin: null
  };
}

/** Full descriptor from the live NondominiumIdentity entry (read from the ndo cell). */
function identityToDescriptor(hash: ActionHash, entry: NondominiumIdentity): NdoDescriptor {
  return {
    hash: encodeHashToBase64(hash),
    name: entry.name,
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

/** Reconstructs the immutable DNA properties from an anchor's cached fields. */
function propertiesFromAnchor(anchor: NdoAnchorEntry): NdoDnaProperties {
  return {
    name: anchor.name,
    property_regime: anchor.property_regime,
    resource_nature: anchor.resource_nature,
    created_at: anchor.ndo_created_at
  };
}

// ─── Live Layer ───────────────────────────────────────────────────────────────

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

    /** Call a zome_resource function on a specific ndo clone cell. */
    const callNdoZome = <T>(
      cellId: CellId,
      fn: string,
      payload: unknown
    ): E.Effect<T, ResourceError> =>
      E.tryPromise({
        try: async () => {
          if (!holochainClient.isConnected) await holochainClient.connectClient();
          return holochainClient.callZome(
            'zome_resource',
            fn,
            payload,
            undefined,
            undefined,
            cellId
          ) as Promise<T>;
        },
        catch: (e) => ResourceError.fromError(e, `NDO_CELL_${fn.toUpperCase()}`)
      });

    /** Collect the NdoAnchors for one group (cell + live group hash). */
    const anchorsForGroup = (
      groupId: string
    ): E.Effect<NdoAnchorEntry[], ResourceError> =>
      E.gen(function* () {
        const cell = yield* lobby.getGroupCell(groupId).pipe(E.catchAll(() => E.succeed(null)));
        const groupHashB64 = yield* lobby
          .getGroupHash(groupId)
          .pipe(E.catchAll(() => E.succeed(null)));
        if (!cell || !groupHashB64) return [];
        const groupHash = decodeHashFromBase64(groupHashB64) as ActionHash;
        return yield* groupService
          .getNdoAnchors(cell.cellId, groupHash)
          .pipe(E.catchAll(() => E.succeed([])));
      });

    /**
     * Finds the anchor for an NDO identity across the agent's groups, then
     * ensures the ndo clone cell is present (creating it from coordinates for a
     * peer). Returns null if no anchor is found (caller falls back to legacy
     * shared-cell reads).
     */
    const resolveNdoCellForIdentity = (
      identityHashB64: string
    ): E.Effect<{ cellId: CellId; anchor: NdoAnchorEntry } | null, ResourceError> =>
      E.gen(function* () {
        const groups = yield* lobby.getMyGroups().pipe(E.catchAll(() => E.succeed([])));
        let found: NdoAnchorEntry | null = null;
        for (const g of groups) {
          const anchors = yield* anchorsForGroup(g.id);
          const match = anchors.find(
            (a) => encodeHashToBase64(a.identity_action_hash) === identityHashB64
          );
          if (match) {
            found = match;
            break;
          }
        }
        if (!found) return null;
        const anchor = found;
        const cellId = yield* E.tryPromise({
          try: () =>
            holochainClient.ensureNdoCloneCell(anchor.ndo_dna_hash, {
              networkSeed: anchor.network_seed,
              properties: propertiesFromAnchor(anchor)
            }),
          catch: (e) => ResourceError.fromError(e, 'ENSURE_NDO_CELL')
        });
        return { cellId, anchor };
      });

    return {
      getLobbyNdoDescriptors: () =>
        E.gen(function* () {
          const groups = yield* lobby.getMyGroups().pipe(E.catchAll(() => E.succeed([])));
          const descriptors: NdoDescriptor[] = [];
          const seen = new Set<string>();
          for (const g of groups) {
            const anchors = yield* anchorsForGroup(g.id);
            for (const a of anchors) {
              const id = encodeHashToBase64(a.identity_action_hash);
              if (seen.has(id)) continue;
              seen.add(id);
              descriptors.push(anchorToDescriptor(a));
            }
          }
          return descriptors;
        }),

      getNdoDescriptorForSpecActionHash: (hash) =>
        E.gen(function* () {
          const hashB64 = encodeHashToBase64(hash);

          // Per-cell path: resolve the ndo cell from the anchor and read the live entry.
          const resolved = yield* resolveNdoCellForIdentity(hashB64).pipe(
            E.catchAll(() => E.succeed(null))
          );
          if (resolved) {
            const entry = yield* callNdoZome<NondominiumIdentity | null>(
              resolved.cellId,
              'get_ndo',
              hash
            );
            if (entry) return identityToDescriptor(hash, entry);
          }

          // Legacy shared-cell fallback (NDOs created before per-cell migration).
          const legacy = yield* resource.getNdo(hash);
          if (legacy) return identityToDescriptor(hash, legacy);

          return yield* E.fail(new NdoNotFoundError({ hash: hashB64 }));
        }),

      createNdo: (input, groupId) =>
        E.gen(function* () {
          const myPubKey = yield* E.tryPromise({
            try: () => holochainClient.getMyAgentPubKey(),
            catch: (e) => ResourceError.fromError(e, 'CREATE_NDO_PUBKEY')
          });
          // Microseconds — the unit of Holochain sys_time / Timestamp. The anchor
          // caches THIS value (not the entry's sys_time) so peers re-derive the
          // exact same DnaHash from the anchor coordinates.
          const createdAt = Date.now() * 1000;
          const properties: NdoDnaProperties = {
            name: input.name,
            property_regime: input.property_regime,
            resource_nature: input.resource_nature,
            created_at: createdAt
          };
          const networkSeed = generateNdoNetworkSeed();

          // 1. Provision the per-NDO clone cell (DnaHash bound to identity via properties).
          const cloned = yield* E.tryPromise({
            try: () => holochainClient.createNdoCloneCell({ networkSeed, properties }),
            catch: (e) => ResourceError.fromError(e, 'CREATE_NDO_CLONE_CELL')
          });
          const ndoCellId = cloned.cell_id;
          const ndoDnaHash = cloned.cell_id[0];

          // 2. Genesis identity inside the ndo cell (entry bound to properties, ADR-013).
          const ndoOut = yield* callNdoZome<NdoOutput>(ndoCellId, 'create_ndo', {
            name: input.name,
            property_regime: input.property_regime,
            resource_nature: input.resource_nature,
            lifecycle_stage: input.lifecycle_stage,
            description: input.description ?? null
          });

          // 3. Anchor in the group cell with full clone coordinates (best-effort).
          // `initiator` is cached from the app agent key (== the entry's initiator
          // in production, which shares one key across cells); it is NOT part of the
          // DNA properties (binary can't transit YamlProperties) — display-only here.
          const cell = yield* lobby.getGroupCell(groupId).pipe(E.catchAll(() => E.succeed(null)));
          const groupHashB64 = yield* lobby
            .getGroupHash(groupId)
            .pipe(E.catchAll(() => E.succeed(null)));
          if (cell && groupHashB64) {
            const groupHash = decodeHashFromBase64(groupHashB64) as ActionHash;
            yield* groupService
              .createNdoAnchor(cell.cellId, {
                group_hash: groupHash,
                name: input.name,
                description: input.description ?? null,
                ndo_dna_hash: ndoDnaHash,
                network_seed: networkSeed,
                identity_action_hash: ndoOut.action_hash,
                initiator: myPubKey,
                ndo_created_at: createdAt,
                lifecycle_stage: input.lifecycle_stage,
                property_regime: input.property_regime,
                resource_nature: input.resource_nature
              })
              .pipe(E.catchAll(() => E.void));
          }

          return ndoOut.action_hash;
        }),

      updateLifecycleStage: (input) =>
        E.gen(function* () {
          const hashB64 = encodeHashToBase64(input.original_action_hash);
          const resolved = yield* resolveNdoCellForIdentity(hashB64).pipe(
            E.catchAll(() => E.succeed(null))
          );
          if (resolved) {
            const updatedHash = yield* callNdoZome<ActionHash>(
              resolved.cellId,
              'update_lifecycle_stage',
              input
            );

            // Refresh the group anchor's cached lifecycle_stage so lobby/group
            // cards reflect the new stage without a full reload (and peers
            // converge as the update gossips). Best-effort: a missed refresh only
            // leaves a card on the prior stage until the next reload, never a
            // failed transition. Run in every group; the resolver is a no-op
            // where this NDO identity isn't anchored.
            const groups = yield* lobby.getMyGroups().pipe(E.catchAll(() => E.succeed([])));
            for (const g of groups) {
              const cell = yield* lobby.getGroupCell(g.id).pipe(E.catchAll(() => E.succeed(null)));
              const groupHashB64 = yield* lobby
                .getGroupHash(g.id)
                .pipe(E.catchAll(() => E.succeed(null)));
              if (!cell || !groupHashB64) continue;
              const groupHash = decodeHashFromBase64(groupHashB64) as ActionHash;
              yield* groupService
                .refreshNdoAnchorLifecycleStage(
                  cell.cellId,
                  groupHash,
                  input.original_action_hash,
                  input.new_stage
                )
                .pipe(E.catchAll(() => E.void));
            }

            return updatedHash;
          }
          // Legacy shared-cell fallback.
          return yield* resource.updateLifecycleStage(input);
        }),

      getNdoTransitionHistory: (ndoHash) =>
        E.gen(function* () {
          const hashB64 = encodeHashToBase64(ndoHash);
          const resolved = yield* resolveNdoCellForIdentity(hashB64).pipe(
            E.catchAll(() => E.succeed(null))
          );
          if (resolved) {
            return yield* callNdoZome<NdoTransitionHistoryEvent[]>(
              resolved.cellId,
              'get_ndo_transition_history',
              ndoHash
            ).pipe(E.catchAll(() => E.succeed([])));
          }
          return yield* resource.getNdoTransitionHistory(ndoHash);
        }),

      getGroupNdoDescriptors: (groupId) =>
        E.gen(function* () {
          const anchors = yield* anchorsForGroup(groupId);
          return anchors.map(anchorToDescriptor);
        }),

      getAssociatedGroupIds: (ndoHashB64) =>
        E.gen(function* () {
          const groups = yield* lobby.getMyGroups().pipe(E.catchAll(() => E.succeed([])));
          const associated: string[] = [];
          for (const g of groups) {
            const anchors = yield* anchorsForGroup(g.id);
            if (
              anchors.some(
                (a) => encodeHashToBase64(a.identity_action_hash) === ndoHashB64
              )
            ) {
              associated.push(g.id);
            }
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
