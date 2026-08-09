import { Context, Layer, Effect as E } from 'effect';
import type { ActionHash, CellId } from '@holochain/client';
import { decodeHashFromBase64, encodeHashToBase64 } from '@holochain/client';
import { HolochainClientServiceTag, HolochainClientServiceLive } from '../holochain.service.svelte';
import { GroupError } from '$lib/errors/group.errors';
import { GROUP_CONTEXTS } from '$lib/errors/error-contexts';
import type { SoftLink, NdoAnchorInput, NdoAnchorEntry, LifecycleStage } from '@nondominium/shared-types';
import {
  decodeGroupEntry,
  decodeNdoAnchorRecord,
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
  /** Writes a zome_group NdoAnchor (model A authoritative group→NDO pointer). */
  createNdoAnchor: (groupCellId: CellId, input: NdoAnchorInput) => E.Effect<void, GroupError>;
  /** Reads all NdoAnchors for a group (cards render from these without joining ndo cells). */
  getNdoAnchors: (
    groupCellId: CellId,
    groupHash: ActionHash
  ) => E.Effect<NdoAnchorEntry[], GroupError>;
  /**
   * Refreshes one anchor's cached lifecycle_stage by NDO identity, so
   * lobby/group cards converge on the new stage after a transition without a
   * reload. Best-effort: the caller swallows failures.
   */
  refreshNdoAnchorLifecycleStage: (
    groupCellId: CellId,
    groupHash: ActionHash,
    identityActionHash: ActionHash,
    lifecycleStage: LifecycleStage
  ) => E.Effect<void, GroupError>;
}

export class GroupServiceTag extends Context.Tag('GroupService')<GroupServiceTag, GroupService>() {}

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
            return profile ? (decodeHashFromBase64(profile.groupHashB64) as ActionHash) : null;
          }
        );

      return {
        getMembers: (groupCellId) =>
          E.flatMap(resolveGroupHash(groupCellId), (groupHash) => {
            if (!groupHash) return E.succeed([]);
            return E.map(
              callGroupZome<Uint8Array[]>(
                groupCellId,
                'get_group_members',
                groupHash,
                GROUP_CONTEXTS.GET_GROUP_MEMBERS
              ),
              (memberPubKeys) =>
                memberPubKeys.map((pk) => {
                  const authorB64 = encodeHashToBase64(pk);
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
              records.map((r) => softLinkTargetHashB64(r)).filter((h): h is string => h !== null)
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

        createNdoAnchor: (groupCellId, input) =>
          E.gen(function* () {
            yield* callGroupZome<GroupHolochainRecord>(
              groupCellId,
              'create_ndo_anchor',
              input,
              'CREATE_NDO_ANCHOR'
            );
          }),

        getNdoAnchors: (groupCellId, groupHash) =>
          E.gen(function* () {
            const records = yield* callGroupZome<GroupHolochainRecord[]>(
              groupCellId,
              'get_ndo_anchors',
              groupHash,
              'GET_NDO_ANCHORS'
            );
            return records
              .map((r) => decodeNdoAnchorRecord(r))
              .filter((a): a is NdoAnchorEntry => a !== null);
          }),

        refreshNdoAnchorLifecycleStage: (groupCellId, groupHash, identityActionHash, lifecycleStage) =>
          E.gen(function* () {
            yield* callGroupZome(
              groupCellId,
              'refresh_ndo_anchor_lifecycle_stage',
              {
                group_hash: groupHash,
                identity_action_hash: identityActionHash,
                updated_lifecycle_stage: lifecycleStage
              },
              'REFRESH_NDO_ANCHOR'
            );
          })
      } satisfies GroupService;
    })
  );

export const GroupServiceResolved: Layer.Layer<GroupServiceTag> = GroupServiceLive.pipe(
  Layer.provide(HolochainClientServiceLive)
);
