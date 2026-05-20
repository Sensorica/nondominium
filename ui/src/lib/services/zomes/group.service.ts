import { Context, Layer, Effect as E } from 'effect';
import type { ActionHash } from '@holochain/client';
import {
  HolochainClientServiceTag,
  HolochainClientServiceLive
} from '../holochain.service.svelte';
import { GroupError } from '$lib/errors/group.errors';
import { GROUP_CONTEXTS } from '$lib/errors/error-contexts';
import type { GroupMembership, WorkLog, SoftLink } from '@nondominium/shared-types';

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

// GroupServiceTag interface is frozen (ADR-GROUP-03).
// groupId maps to the group cell's clone role suffix: cell role = `group_${groupId}`.
export interface GroupService {
  getMembers: (groupId: string) => E.Effect<GroupMemberStub[], GroupError>;
  getWorkLogs: (groupId: string) => E.Effect<WorkLogStub[], GroupError>;
  getSoftLinks: (groupId: string) => E.Effect<SoftLinkStub[], GroupError>;
}

export class GroupServiceTag extends Context.Tag('GroupService')<GroupServiceTag, GroupService>() {}

export const GroupServiceLive: Layer.Layer<GroupServiceTag, never, HolochainClientServiceTag> =
  Layer.effect(
    GroupServiceTag,
    E.gen(function* () {
      const holochainClient = yield* HolochainClientServiceTag;

      // Call a function on the cloned group cell for the given groupId.
      const callGroupZome = <T>(
        groupId: string,
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
              `group_${groupId}`
            ) as Promise<T>;
          },
          catch: (error) => GroupError.fromError(error, context)
        });

      // Each cloned cell = one group. `get_my_group` returns the single GroupProfile.
      const resolveGroupHash = (groupId: string): E.Effect<ActionHash | null, GroupError> =>
        E.map(
          callGroupZome<{ signed_action: { hashed: { hash: ActionHash } } } | null>(
            groupId,
            'get_my_group',
            null,
            GROUP_CONTEXTS.GET_GROUP
          ),
          (record) => record?.signed_action?.hashed?.hash ?? null
        );

      return {
        getMembers: (groupId) =>
          E.flatMap(resolveGroupHash(groupId), (groupHash) => {
            if (!groupHash) return E.succeed([]);
            return E.map(
              callGroupZome<GroupMembership[]>(
                groupId,
                'get_group_members',
                groupHash,
                GROUP_CONTEXTS.GET_GROUP_MEMBERS
              ),
              (members) =>
                members.map((m) => ({
                  id: String(m.member),
                  name: String(m.member).slice(0, 8)
                }))
            );
          }),

        getWorkLogs: (groupId) =>
          E.flatMap(resolveGroupHash(groupId), (groupHash) => {
            if (!groupHash) return E.succeed([]);
            return E.map(
              callGroupZome<WorkLog[]>(
                groupId,
                'get_work_logs',
                groupHash,
                GROUP_CONTEXTS.GET_WORK_LOGS
              ),
              (logs) =>
                logs.map((l) => ({
                  id: String(l.logged_at),
                  title: l.description
                }))
            );
          }),

        getSoftLinks: (groupId) =>
          E.flatMap(resolveGroupHash(groupId), (groupHash) => {
            if (!groupHash) return E.succeed([]);
            return E.map(
              callGroupZome<SoftLink[]>(
                groupId,
                'get_soft_links',
                groupHash,
                GROUP_CONTEXTS.GET_SOFT_LINKS
              ),
              (links) =>
                links.map((sl) => ({
                  id: String(sl.created_at),
                  label: sl.description ?? 'Soft link'
                }))
            );
          })
      } satisfies GroupService;
    })
  );

export const GroupServiceResolved: Layer.Layer<GroupServiceTag> = GroupServiceLive.pipe(
  Layer.provide(HolochainClientServiceLive)
);
