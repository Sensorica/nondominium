import { Context, Layer, Effect as E } from 'effect';
import type { GroupDescriptor, NdoDescriptor } from '@nondominium/shared-types';
import type { DomainError } from '$lib/errors';

const GROUPS_KEY = 'ndo_groups_v1';

function loadGroupsFromStorage(): GroupDescriptor[] {
  try {
    const raw = localStorage.getItem(GROUPS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as GroupDescriptor[];
  } catch {
    return [];
  }
}

function saveGroupsToStorage(groups: GroupDescriptor[]): void {
  try {
    localStorage.setItem(GROUPS_KEY, JSON.stringify(groups));
  } catch {
    // localStorage not available
  }
}

function generateId(): string {
  return `grp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export interface LobbyService {
  getMyGroups: () => E.Effect<GroupDescriptor[], DomainError>;
  getAllNdoDescriptors: () => E.Effect<NdoDescriptor[], DomainError>;
  createGroup: (name: string, createdBy?: string) => E.Effect<GroupDescriptor, DomainError>;
  joinGroup: (inviteCode: string) => E.Effect<GroupDescriptor, DomainError>;
  generateInviteLink: (groupId: string) => E.Effect<string, DomainError>;
}

export class LobbyServiceTag extends Context.Tag('LobbyService')<
  LobbyServiceTag,
  LobbyService
>() {}

export const LobbyServiceLive = Layer.succeed(LobbyServiceTag, {
  getMyGroups: () => E.sync(loadGroupsFromStorage),

  getAllNdoDescriptors: () => E.succeed([]),

  createGroup: (name, createdBy) =>
    E.sync(() => {
      const groups = loadGroupsFromStorage();
      const newGroup: GroupDescriptor = {
        id: generateId(),
        name: name.trim(),
        createdBy,
        createdAt: Date.now(),
        ndoHashes: []
      };
      saveGroupsToStorage([...groups, newGroup]);
      return newGroup;
    }),

  joinGroup: (inviteCode) =>
    E.try({
      try: () => {
        const encoded = inviteCode.includes('?group=')
          ? inviteCode.split('?group=')[1]
          : inviteCode;
        const decoded = atob(encoded);
        const groupData: GroupDescriptor = JSON.parse(decoded);
        const groups = loadGroupsFromStorage();
        if (groups.some((g) => g.id === groupData.id)) return groupData;
        saveGroupsToStorage([...groups, { ...groupData, ndoHashes: groupData.ndoHashes ?? [] }]);
        return groupData;
      },
      catch: (e) => {
        throw new Error(`Invalid invite code: ${String(e)}`);
      }
    }) as E.Effect<GroupDescriptor, DomainError>,

  generateInviteLink: (groupId) =>
    E.sync(() => {
      const groups = loadGroupsFromStorage();
      const group = groups.find((g) => g.id === groupId);
      if (!group) return '';
      const encoded = btoa(JSON.stringify(group));
      return `${window.location.origin}?group=${encoded}`;
    })
});

export const LobbyServiceResolved = LobbyServiceLive;
