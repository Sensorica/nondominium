import type { ActionHash, AgentPubKey } from '@holochain/client';
import type { Person } from '@nondominium/shared-types';

export const appContext = {
  myAgentPubKey: $state<AgentPubKey | null>(null),
  myPerson: $state<Person | null>(null),
  currentView: $state<'lobby' | 'group' | 'ndo'>('lobby'),
  selectedGroupId: $state<string | null>(null),
  selectedNdoId: $state<ActionHash | null>(null)
};
