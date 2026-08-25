import { Context, Effect as E, Layer } from 'effect';
import type { ActionHash, AgentPubKey, CellId } from '@holochain/client';
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
import { NdoNotFoundError } from '$lib/errors/ndo.errors';
import { ResourceError } from '$lib/errors/resource.errors';
import {
  ResourceServiceTag,
  ResourceServiceResolved
} from './resource.service';
import { LobbyServiceTag, LobbyServiceResolved } from './lobby.service';
import { GroupServiceTag, GroupServiceResolved } from './group.service';
import { PersonServiceTag, PersonServiceResolved } from './person.service';
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
  /**
   * Anchors an already-created NDO in a second group, copying the identity
   * coordinates from an existing anchor. This is what "associate with a group"
   * means under model A: an NdoAnchor is the only pointer the read paths follow.
   */
  associateNdoWithGroup: (
    ndoHashB64: string,
    targetGroupId: string
  ) => E.Effect<void, ResourceError | NdoNotFoundError>;
  /**
   * Resolves the cloned `ndo` cell holding this NDO's Layer 0 identity,
   * provisioning it from the anchor coordinates when this agent never joined.
   * Returns null for legacy NDOs still living in the shared `nondominium`
   * cell, in which case callers omit the cellId and hit the provisioned cell.
   *
   * Layer 1 and Layer 2 reads and writes MUST route through this: the identity
   * they reference only exists inside the NDO's own DHT (ADR-010/ADR-013).
   */
  resolveCellIdForNdo: (ndoHash: ActionHash) => E.Effect<CellId | null, ResourceError>;
  /**
   * Declare participation in an NDO. Idempotent: joining twice is a no-op, not an error.
   * Membership makes participation listable; it is not an access grant (the agent already
   * holds the cloned cell to read the NDO at all).
   */
  joinNdo: (ndoHashB64: string) => E.Effect<void, ResourceError | NdoNotFoundError>;
  getNdoMembers: (
    ndoHashB64: string
  ) => E.Effect<{ id: string; name: string }[], ResourceError | NdoNotFoundError>;
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
    // The anchor caches only the card fields; rivalry_override is not among
    // them, so it stays null here and is filled by the live read on open.
    rivalry_override: null,
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
    hibernation_origin: entry.hibernation_origin ? String(entry.hibernation_origin) : null,
    rivalry_override: entry.rivalry_override ? String(entry.rivalry_override) : null
  };
}

/** One group's cell coordinates plus the anchors it holds (one scan pass). */
interface GroupAnchors {
  groupId: string;
  groupCellId: CellId;
  groupHash: ActionHash;
  anchors: NdoAnchorEntry[];
}

/** A group that anchors a particular NDO identity. */
interface AnchorMatch {
  groupId: string;
  groupCellId: CellId;
  groupHash: ActionHash;
  anchor: NdoAnchorEntry;
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
  PersonServiceResolved,
  HolochainClientServiceLive
);

export const NdoServiceLive: Layer.Layer<
  NdoServiceTag,
  never,
  | ResourceServiceTag
  | LobbyServiceTag
  | GroupServiceTag
  | PersonServiceTag
  | HolochainClientServiceTag
> = Layer.effect(
  NdoServiceTag,
  E.gen(function* () {
    const resource = yield* ResourceServiceTag;
    const lobby = yield* LobbyServiceTag;
    const groupService = yield* GroupServiceTag;
    const person = yield* PersonServiceTag;
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

    /** A group's live coordinates: its cell and its GroupProfile action hash. */
    const groupContext = (
      groupId: string
    ): E.Effect<{ groupCellId: CellId; groupHash: ActionHash } | null, ResourceError> =>
      E.gen(function* () {
        const cell = yield* lobby.getGroupCell(groupId).pipe(E.catchAll(() => E.succeed(null)));
        const groupHashB64 = yield* lobby
          .getGroupHash(groupId)
          .pipe(E.catchAll(() => E.succeed(null)));
        if (!cell || !groupHashB64) return null;
        return {
          groupCellId: cell.cellId,
          groupHash: decodeHashFromBase64(groupHashB64) as ActionHash
        };
      });

    /** Collect the NdoAnchors for one group. */
    const anchorsForGroup = (groupId: string): E.Effect<NdoAnchorEntry[], ResourceError> =>
      E.gen(function* () {
        const ctx = yield* groupContext(groupId);
        if (!ctx) return [];
        return yield* groupService
          .getNdoAnchors(ctx.groupCellId, ctx.groupHash)
          .pipe(E.catchAll(() => E.succeed([])));
      });

    /**
     * ONE pass over the agent's groups. Every question about "where is this NDO
     * anchored" is answered from a single scan — resolving the cell, listing the
     * associated groups, and refreshing caches after a transition all reuse it
     * rather than re-walking every group cell.
     */
    const scanGroupAnchors = (): E.Effect<GroupAnchors[], ResourceError> =>
      E.gen(function* () {
        const groups = yield* lobby.getMyGroups().pipe(E.catchAll(() => E.succeed([])));
        const scan: GroupAnchors[] = [];
        for (const g of groups) {
          const ctx = yield* groupContext(g.id);
          if (!ctx) continue;
          const anchors = yield* groupService
            .getNdoAnchors(ctx.groupCellId, ctx.groupHash)
            .pipe(E.catchAll(() => E.succeed([] as NdoAnchorEntry[])));
          scan.push({ groupId: g.id, ...ctx, anchors });
        }
        return scan;
      });

    /** Every group that anchors this NDO identity, from one scan. */
    const matchesForIdentity = (
      identityHashB64: string
    ): E.Effect<AnchorMatch[], ResourceError> =>
      E.gen(function* () {
        const scan = yield* scanGroupAnchors();
        const matches: AnchorMatch[] = [];
        for (const g of scan) {
          const anchor = g.anchors.find(
            (a) => encodeHashToBase64(a.identity_action_hash) === identityHashB64
          );
          if (anchor) {
            matches.push({
              groupId: g.groupId,
              groupCellId: g.groupCellId,
              groupHash: g.groupHash,
              anchor
            });
          }
        }
        return matches;
      });

    /** Provisions (or reuses) the ndo clone cell an anchor's coordinates name. */
    const ensureCellForAnchor = (anchor: NdoAnchorEntry): E.Effect<CellId, ResourceError> =>
      E.tryPromise({
        try: () =>
          holochainClient.ensureNdoCloneCell(anchor.ndo_dna_hash, {
            networkSeed: anchor.network_seed,
            properties: propertiesFromAnchor(anchor)
          }),
        catch: (e) => ResourceError.fromError(e, 'ENSURE_NDO_CELL')
      });

    /**
     * Finds the anchor for an NDO identity, then ensures the ndo clone cell is
     * present (creating it from coordinates for a peer who never joined it).
     * Returns null if no anchor is found — the caller falls back to legacy
     * shared-cell reads. `matches` is handed back so callers that also need the
     * group list do not scan a second time.
     */
    const resolveNdoCellForIdentity = (
      identityHashB64: string
    ): E.Effect<{ cellId: CellId; anchor: NdoAnchorEntry; matches: AnchorMatch[] } | null, ResourceError> =>
      E.gen(function* () {
        const matches = yield* matchesForIdentity(identityHashB64);
        const first = matches[0];
        if (!first) return null;
        const cellId = yield* ensureCellForAnchor(first.anchor);
        return { cellId, anchor: first.anchor, matches };
      });

    /**
     * Membership variant of the resolver. Unlike reads, membership has no legacy
     * shared-cell fallback: an NDO with no anchor cannot be joined, so an unresolved
     * identity is a hard NdoNotFoundError rather than a silent degrade.
     */
    const resolveNdoCellOrFail = (
      identityHashB64: string
    ): E.Effect<{ cellId: CellId; identityHash: ActionHash }, ResourceError | NdoNotFoundError> =>
      E.gen(function* () {
        const resolved = yield* resolveNdoCellForIdentity(identityHashB64);
        if (!resolved) {
          return yield* E.fail(new NdoNotFoundError({ hash: identityHashB64 }));
        }
        return {
          cellId: resolved.cellId,
          identityHash: resolved.anchor.identity_action_hash
        };
      });

    return {
      getLobbyNdoDescriptors: () =>
        E.gen(function* () {
          const scan = yield* scanGroupAnchors();
          const descriptors: NdoDescriptor[] = [];
          const seen = new Set<string>();
          for (const g of scan) {
            for (const a of g.anchors) {
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
          // Microseconds — the unit of Holochain sys_time / Timestamp — derived
          // from a millisecond wall clock, so this is NOT a uniqueness source;
          // `networkSeed` below is what makes two identically-classified NDOs
          // distinct. The anchor caches THIS value (not the entry's sys_time) so
          // peers re-derive the exact same DnaHash from the anchor coordinates.
          const createdAt = Date.now() * 1000;
          const properties: NdoDnaProperties = {
            name: input.name,
            property_regime: input.property_regime,
            resource_nature: input.resource_nature,
            created_at: createdAt
          };
          const networkSeed = generateNdoNetworkSeed();

          // 0. Resolve the destination group FIRST. The anchor is the only pointer
          // any read path follows, so a group we cannot anchor into means the NDO
          // would be unreachable — better to fail before provisioning a cell than
          // to leave an orphan behind.
          const ctx = yield* groupContext(groupId);
          if (!ctx) {
            return yield* E.fail(
              ResourceError.fromError(
                new Error(
                  `Group ${groupId} has no resolvable cell or profile hash; refusing to create an NDO that could not be anchored.`
                ),
                'CREATE_NDO_ANCHOR'
              )
            );
          }

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

          // 3. Anchor in the group cell with full clone coordinates. NOT
          // best-effort: a swallowed failure here leaves a cell nobody — including
          // its creator — can ever reach again.
          // `initiator` is cached from the app agent key (== the entry's initiator
          // in production, which shares one key across cells); it is NOT part of the
          // DNA properties (binary can't transit YamlProperties) — display-only here.
          yield* groupService
            .createNdoAnchor(ctx.groupCellId, {
              group_hash: ctx.groupHash,
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
            .pipe(E.mapError((e) => ResourceError.fromError(e, 'CREATE_NDO_ANCHOR')));

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

            // Refresh the cached lifecycle_stage on every anchor for this NDO so
            // lobby/group cards reflect the new stage without a full reload (and
            // peers converge as the update gossips). Only the groups that actually
            // anchor it are touched — `resolved.matches` already names them, so no
            // second walk over every group cell. Best-effort: a missed refresh
            // leaves a card on the prior stage until the next reload, never a
            // failed transition.
            for (const m of resolved.matches) {
              yield* groupService
                .refreshNdoAnchorLifecycleStage(
                  m.groupCellId,
                  m.groupHash,
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
          const matches = yield* matchesForIdentity(ndoHashB64);
          return matches.map((m) => m.groupId);
        }),

      associateNdoWithGroup: (ndoHashB64, targetGroupId) =>
        E.gen(function* () {
          const matches = yield* matchesForIdentity(ndoHashB64);
          const source = matches[0];
          if (!source) {
            // Nothing to copy coordinates from: an NDO with no anchor anywhere in
            // the agent's groups cannot be re-anchored, only re-created.
            return yield* E.fail(new NdoNotFoundError({ hash: ndoHashB64 }));
          }
          if (matches.some((m) => m.groupId === targetGroupId)) return; // already anchored

          const target = yield* groupContext(targetGroupId);
          if (!target) {
            return yield* E.fail(
              ResourceError.fromError(
                new Error(`Group ${targetGroupId} has no resolvable cell or profile hash.`),
                'CREATE_NDO_ANCHOR'
              )
            );
          }

          // Same NDO identity, same clone coordinates, new owning group. The
          // cached descriptor fields come from the source anchor so the card
          // renders identically in both groups until the next refresh.
          const a = source.anchor;
          yield* groupService
            .createNdoAnchor(target.groupCellId, {
              group_hash: target.groupHash,
              name: a.name,
              description: a.description,
              ndo_dna_hash: a.ndo_dna_hash,
              network_seed: a.network_seed,
              identity_action_hash: a.identity_action_hash,
              initiator: a.initiator,
              ndo_created_at: a.ndo_created_at,
              lifecycle_stage: a.lifecycle_stage,
              property_regime: a.property_regime,
              resource_nature: a.resource_nature
            })
            .pipe(E.mapError((e) => ResourceError.fromError(e, 'CREATE_NDO_ANCHOR')));
        }),

      resolveCellIdForNdo: (ndoHash) =>
        E.gen(function* () {
          const resolved = yield* resolveNdoCellForIdentity(
            encodeHashToBase64(ndoHash)
          ).pipe(E.catchAll(() => E.succeed(null)));
          return resolved ? resolved.cellId : null;
        }),

      joinNdo: (ndoHashB64) =>
        E.gen(function* () {
          const { cellId, identityHash } = yield* resolveNdoCellOrFail(ndoHashB64);
          const myPubKey = yield* E.tryPromise({
            try: () => holochainClient.getMyAgentPubKey(),
            catch: (e) => ResourceError.fromError(e, 'NDO_CELL_JOIN_NDO')
          });

          // Idempotent by design: re-joining is a benign no-op, not an error the user
          // should see. Mirrors the group's self-healing membership (REQ-UI-GRP-04).
          const alreadyMember = yield* callNdoZome<boolean>(cellId, 'is_ndo_member', [
            myPubKey,
            identityHash
          ]).pipe(E.catchAll(() => E.succeed(false)));
          if (alreadyMember) return;

          yield* callNdoZome<unknown>(cellId, 'join_ndo', {
            ndo_identity_hash: identityHash,
            role: null
          });
        }),

      getNdoMembers: (ndoHashB64) =>
        E.gen(function* () {
          const { cellId, identityHash } = yield* resolveNdoCellOrFail(ndoHashB64);
          const members = yield* callNdoZome<AgentPubKey[]>(
            cellId,
            'get_ndo_members',
            identityHash
          );

          // Person entries live in the provisioned nondominium cell, not the ndo clone,
          // so names are resolved separately. An agent with no Person entry yet is normal
          // (REQ-UI-ID-03 defers Person creation); fall back to a truncated pubkey, the
          // same convention the initiator display uses (REQ-UI-NDO-02).
          const persons = yield* person.getAllPersons().pipe(E.catchAll(() => E.succeed([])));
          const nameByKey = new Map(
            persons.map((p) => [encodeHashToBase64(p.agent_pub_key), p.name])
          );

          return members.map((key) => {
            const id = encodeHashToBase64(key);
            return { id, name: nameByKey.get(id) ?? `${id.slice(0, 8)}…${id.slice(-4)}` };
          });
        })
    } satisfies NdoService;
  })
);

export const NdoServiceResolved: Layer.Layer<NdoServiceTag> = NdoServiceLive.pipe(
  Layer.provide(NdoServiceDepsResolved)
);
