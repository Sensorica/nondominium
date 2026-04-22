import { Context, Layer, Effect as E } from 'effect';
import type { DomainError } from '$lib/errors';

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

export interface GroupService {
  getMembers: (groupId: string) => E.Effect<GroupMemberStub[], DomainError>;
  getWorkLogs: (groupId: string) => E.Effect<WorkLogStub[], DomainError>;
  getSoftLinks: (groupId: string) => E.Effect<SoftLinkStub[], DomainError>;
}

export class GroupServiceTag extends Context.Tag('GroupService')<GroupServiceTag, GroupService>() {}

export const GroupServiceLive = Layer.succeed(GroupServiceTag, {
  getMembers: () => E.succeed([]),
  getWorkLogs: () => E.succeed([]),
  getSoftLinks: () => E.succeed([])
});

export const GroupServiceResolved = GroupServiceLive;
