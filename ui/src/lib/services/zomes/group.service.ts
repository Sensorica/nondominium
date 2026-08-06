import { Context, Layer, Effect as E } from 'effect';
import type { ActionHash, CellId } from '@holochain/client';
import { decodeHashFromBase64, encodeHashToBase64 } from '@holochain/client';
import {
  HolochainClientServiceTag,
  HolochainClientServiceLive
} from '../holochain.service.svelte';
import { GroupError } from '$lib/errors/group.errors';
import { GROUP_CONTEXTS } from '$lib/errors/error-contexts';
import type { NdoAnchorStub, SoftLink } from '@nondominium/shared-types';
import {
  decodeGroupEntry,
  groupProfileFromRecord,
  softLinkTargetHashB64,
  type GroupHolochainRecord
} from '../group-clone.helpers';

export interface GroupMemberStub {
  id: string;
  name: string;
  role?: string;
}

export interface SoftLinkStub {
  id: string;
  label: string;
  targetNdoHashB64: string;
}

export interface GroupService {
  getMembers: (groupCellId: CellId) => E.Effect<GroupMemberStub[], GroupError>;
  getWorkLogs: (groupCellId: CellId) => E.Effect<{ id: string; title: string }[], GroupError>;
  getSoftLinks: (groupCellId: CellId) => E.Effect<SoftLinkStub[], GroupError>;
  getSoftLinkTargetHashes: (groupCellId: CellId) => E.Effect<string[], GroupError>;
  createSoftLink: (
    groupCellId: CellId,
    groupHashB64: string,
    targetNdoHashB64: string,
    description?: string
  ) => E.Effect<void, GroupError>;
  /** Anchors an NDO cell in the group DHT with its full clone coordinates (#112). */
  createNdoAnchor: (groupCellId: CellId, anchor: NdoAnchorStub) => E.Effect<void, GroupError>;
  /** Reads the group's NDO anchors (latest cached descriptors). */
  getNdoAnchors: (groupCellId: CellId) => E.Effect<NdoAnchorStub[], GroupError>;
}

export class GroupServiceTag extends Context.Tag('GroupService')<GroupServiceTag, GroupService>() { }

export const GroupServiceLive: Layer.Layer<GroupServiceTag, never, HolochainClientServiceTag> =
  Layer.effect(
    GroupServiceTag,
    E.gen(function* () {
      const holochainClient = yield* HolochainClientServiceTag;

      const callGroupZome = <T>(
        groupCellId: CellId,
        fnName: string,
        payload: unknown,
        context: string
      ): E.Effect<T, GroupError> =>
        E.tryPromise({
          try: async () => {
            if (!holochainClient.isConnected) await holochainClient.connectClient();
            return holochainClient.callZome(
              'zome_group',
              fnName,
              payload,
              undefined,
              undefined,
              groupCellId
            ) as Promise<T>;
          },
          catch: (error) => GroupError.fromError(error, context)
        });

      const resolveGroupHash = (groupCellId: CellId): E.Effect<ActionHash | null, GroupError> =>
        E.map(
          callGroupZome<GroupHolochainRecord | null>(
            groupCellId,
            'get_my_group',
            null,
            GROUP_CONTEXTS.GET_GROUP
          ),
          (record) => {
            const profile = record ? groupProfileFromRecord(record) : null;
            return profile
              ? (decodeHashFromBase64(profile.groupHashB64) as ActionHash)
              : null;
          }
        );

      return {
        getMembers: (groupCellId) =>
          E.flatMap(resolveGroupHash(groupCellId), (groupHash) => {
            if (!groupHash) return E.succeed([]);
            return E.map(
              callGroupZome<GroupHolochainRecord[]>(
                groupCellId,
                'get_group_members',
                groupHash,
                GROUP_CONTEXTS.GET_GROUP_MEMBERS
              ),
              (records) =>
                records.map((r) => {
                  const authorBytes = r.signed_action?.hashed?.content?.author;
                  const authorB64 = authorBytes ? encodeHashToBase64(authorBytes) : 'unknown';
                  return {
                    id: authorB64,
                    name: `${authorB64.slice(0, 8)}…${authorB64.slice(-4)}`,
                    role: 'Member'
                  };
                })
            );
          }),

        getWorkLogs: (groupCellId) =>
          E.flatMap(resolveGroupHash(groupCellId), (groupHash) => {
            if (!groupHash) return E.succeed([]);
            return E.map(
              callGroupZome<GroupHolochainRecord[]>(
                groupCellId,
                'get_work_logs',
                groupHash,
                GROUP_CONTEXTS.GET_WORK_LOGS
              ),
              (records) =>
                records.map((r, i) => {
                  const log = decodeGroupEntry(r);
                  return {
                    id: String(r.signed_action?.hashed?.content?.timestamp ?? i),
                    title: log?.description ?? '(work log)'
                  };
                })
            );
          }),

        getSoftLinks: (groupCellId) =>
          E.flatMap(resolveGroupHash(groupCellId), (groupHash) => {
            if (!groupHash) return E.succeed([]);
            return E.map(
              callGroupZome<GroupHolochainRecord[]>(
                groupCellId,
                'get_soft_links',
                groupHash,
                GROUP_CONTEXTS.GET_SOFT_LINKS
              ),
              (records) =>
                records.map((r, i) => {
                  const sl = decodeGroupEntry(r) as (SoftLink & { description?: string }) | null;
                  const target = softLinkTargetHashB64(r) ?? '';
                  return {
                    id: String(r.signed_action?.hashed?.content?.timestamp ?? i),
                    label: sl?.description ?? 'Soft link',
                    targetNdoHashB64: target
                  };
                })
            );
          }),

        getSoftLinkTargetHashes: (groupCellId) =>
          E.map(
            E.flatMap(resolveGroupHash(groupCellId), (groupHash) => {
              if (!groupHash) return E.succeed([] as GroupHolochainRecord[]);
              return callGroupZome<GroupHolochainRecord[]>(
                groupCellId,
                'get_soft_links',
                groupHash,
                GROUP_CONTEXTS.GET_SOFT_LINKS
              );
            }),
            (records) =>
              records
                .map((r) => softLinkTargetHashB64(r))
                .filter((h): h is string => h !== null)
          ),

        createSoftLink: (groupCellId, groupHashB64, targetNdoHashB64, description) =>
          E.gen(function* () {
            const groupHash = decodeHashFromBase64(groupHashB64) as ActionHash;
            const targetNdoHash = decodeHashFromBase64(targetNdoHashB64) as ActionHash;
            yield* callGroupZome<GroupHolochainRecord>(
              groupCellId,
              'create_soft_link',
              {
                group_hash: groupHash,
                target_ndo_hash: targetNdoHash,
                description: description ?? null
              },
              GROUP_CONTEXTS.CREATE_SOFT_LINK
            );
          }),

        createNdoAnchor: (groupCellId, anchor) =>
          E.gen(function* () {
            yield* callGroupZome<GroupHolochainRecord>(
              groupCellId,
              'create_ndo_anchor',
              {
                group_hash: decodeHashFromBase64(anchor.groupHashB64),
                name: anchor.name,
                description: anchor.description,
                ndo_dna_hash: decodeHashFromBase64(anchor.ndoDnaHashB64),
                network_seed: anchor.networkSeed,
                identity_action_hash: decodeHashFromBase64(anchor.identityActionHashB64),
                initiator: decodeHashFromBase64(anchor.initiatorB64),
                ndo_created_at: anchor.ndoCreatedAt,
                lifecycle_stage: anchor.lifecycleStage,
                property_regime: anchor.propertyRegime,
                resource_nature: anchor.resourceNature
              },
              GROUP_CONTEXTS.CREATE_NDO_ANCHOR
            );
          }),

        getNdoAnchors: (groupCellId) =>
          E.flatMap(resolveGroupHash(groupCellId), (groupHash) => {
            if (!groupHash) return E.succeed([] as NdoAnchorStub[]);
            return E.map(
              callGroupZome<GroupHolochainRecord[]>(
                groupCellId,
                'get_ndo_anchors',
                groupHash,
                GROUP_CONTEXTS.GET_NDO_ANCHORS
              ),
              (records) =>
                records
                  .map((r) => {
                    const a = decodeGroupEntry(r);
                    if (
                      !a?.ndo_dna_hash ||
                      !a.network_seed ||
                      !a.identity_action_hash ||
                      !a.initiator ||
                      !a.group_hash
                    ) {
                      return null;
                    }
                    return {
                      groupHashB64: encodeHashToBase64(a.group_hash),
                      name: a.name ?? '(unnamed NDO)',
                      description: a.description ?? null,
                      ndoDnaHashB64: encodeHashToBase64(a.ndo_dna_hash),
                      networkSeed: a.network_seed,
                      identityActionHashB64: encodeHashToBase64(a.identity_action_hash),
                      initiatorB64: encodeHashToBase64(a.initiator),
                      ndoCreatedAt: Number(a.ndo_created_at ?? 0),
                      lifecycleStage: String(a.lifecycle_stage ?? 'Ideation'),
                      propertyRegime: String(a.property_regime ?? 'Nondominium'),
                      resourceNature: String(a.resource_nature ?? 'Physical')
                    } satisfies NdoAnchorStub;
                  })
                  .filter((a): a is NdoAnchorStub => a !== null)
            );
          })
      } satisfies GroupService;
    })
  );

export const GroupServiceResolved: Layer.Layer<GroupServiceTag> = GroupServiceLive.pipe(
  Layer.provide(HolochainClientServiceLive)
);
