import { Context, Layer, Effect as E } from 'effect';
import type { ActionHash, CellId } from '@holochain/client';
import { encodeHashToBase64 } from '@holochain/client';
import {
  HolochainClientServiceTag,
  HolochainClientServiceLive
} from '../holochain.service.svelte';
import { GroupError } from '$lib/errors/group.errors';
import { GROUP_CONTEXTS } from '$lib/errors/error-contexts';
import type { WorkLog, SoftLink } from '@nondominium/shared-types';

// Stub types preserved for backward compatibility with existing UI components.
export interface GroupMemberStub {
  id: string;
  name: string;
}

export interface WorkLogStub {
  id: string;
  title: string;
}

export interface SoftLinkStub {
  id: string;
  label: string;
}

// Minimal shape of a Holochain Record as returned by callZome.
// Author (member identity) and timestamp come from the action header.
interface HolochainRecord {
  signed_action: {
    hashed: {
      hash: Uint8Array;
      content: {
        author: Uint8Array;
        timestamp: number;
      };
    };
  };
}

// GroupServiceTag interface (ADR-GROUP-03: interface stable, CellId replaces string groupId).
export interface GroupService {
  getMembers: (groupCellId: CellId) => E.Effect<GroupMemberStub[], GroupError>;
  getWorkLogs: (groupCellId: CellId) => E.Effect<WorkLogStub[], GroupError>;
  getSoftLinks: (groupCellId: CellId) => E.Effect<SoftLinkStub[], GroupError>;
}

export class GroupServiceTag extends Context.Tag('GroupService')<GroupServiceTag, GroupService>() {}

export const GroupServiceLive: Layer.Layer<GroupServiceTag, never, HolochainClientServiceTag> =
  Layer.effect(
    GroupServiceTag,
    E.gen(function* () {
      const holochainClient = yield* HolochainClientServiceTag;

      // Call a function on the cloned group cell identified by its CellId.
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
              undefined,   // roleName not used when cellId is provided
              groupCellId  // CellId addressing for cloned group cell
            ) as Promise<T>;
          },
          catch: (error) => GroupError.fromError(error, context)
        });

      // Each cloned cell = one group. `get_my_group` returns the single GroupProfile Record.
      const resolveGroupHash = (groupCellId: CellId): E.Effect<ActionHash | null, GroupError> =>
        E.map(
          callGroupZome<HolochainRecord | null>(
            groupCellId,
            'get_my_group',
            null,
            GROUP_CONTEXTS.GET_GROUP
          ),
          (record) => (record?.signed_action?.hashed?.hash as ActionHash | undefined) ?? null
        );

      return {
        // get_group_members returns Vec<Record>; member identity is record.signed_action.hashed.content.author
        getMembers: (groupCellId) =>
          E.flatMap(resolveGroupHash(groupCellId), (groupHash) => {
            if (!groupHash) return E.succeed([]);
            return E.map(
              callGroupZome<HolochainRecord[]>(
                groupCellId,
                'get_group_members',
                groupHash,
                GROUP_CONTEXTS.GET_GROUP_MEMBERS
              ),
              (records) =>
                records.map((r) => {
                  const authorBytes = r.signed_action?.hashed?.content?.author;
                  const authorB64 = authorBytes ? encodeHashToBase64(authorBytes) : 'unknown';
                  return { id: authorB64, name: authorB64.slice(0, 8) };
                })
            );
          }),

        // get_work_logs returns Vec<Record>; entry contains WorkLog data (description, hours)
        getWorkLogs: (groupCellId) =>
          E.flatMap(resolveGroupHash(groupCellId), (groupHash) => {
            if (!groupHash) return E.succeed([]);
            return E.map(
              callGroupZome<(HolochainRecord & { entry?: { Present?: { entry: WorkLog } } })[]>(
                groupCellId,
                'get_work_logs',
                groupHash,
                GROUP_CONTEXTS.GET_WORK_LOGS
              ),
              (records) =>
                records.map((r, i) => {
                  const log = r.entry?.Present?.entry;
                  return {
                    id: String(r.signed_action?.hashed?.content?.timestamp ?? i),
                    title: log?.description ?? '(work log)'
                  };
                })
            );
          }),

        // get_soft_links returns Vec<Record>; entry contains SoftLink data (description)
        getSoftLinks: (groupCellId) =>
          E.flatMap(resolveGroupHash(groupCellId), (groupHash) => {
            if (!groupHash) return E.succeed([]);
            return E.map(
              callGroupZome<(HolochainRecord & { entry?: { Present?: { entry: SoftLink } } })[]>(
                groupCellId,
                'get_soft_links',
                groupHash,
                GROUP_CONTEXTS.GET_SOFT_LINKS
              ),
              (records) =>
                records.map((r, i) => {
                  const sl = r.entry?.Present?.entry;
                  return {
                    id: String(r.signed_action?.hashed?.content?.timestamp ?? i),
                    label: sl?.description ?? 'Soft link'
                  };
                })
            );
          })
      } satisfies GroupService;
    })
  );

export const GroupServiceResolved: Layer.Layer<GroupServiceTag> = GroupServiceLive.pipe(
  Layer.provide(HolochainClientServiceLive)
);
