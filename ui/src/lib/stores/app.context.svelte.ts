import type { ActionHash, AgentPubKey } from '@holochain/client';
import type { Person } from '@nondominium/shared-types';

let myAgentPubKey = $state<AgentPubKey | null>(null);
let myPerson = $state<Person | null>(null);
let currentView = $state<'lobby' | 'group' | 'ndo'>('lobby');
let selectedGroupId = $state<string | null>(null);
let selectedNdoId = $state<ActionHash | null>(null);

/** App-wide rune state. Use `$state` only at module top level (not inside object literals). */
export const appContext = {
  get myAgentPubKey() {
    return myAgentPubKey;
  },
  set myAgentPubKey(v: AgentPubKey | null) {
    myAgentPubKey = v;
  },
  get myPerson() {
    return myPerson;
  },
  set myPerson(v: Person | null) {
    myPerson = v;
  },
  get currentView() {
    return currentView;
  },
  set currentView(v: 'lobby' | 'group' | 'ndo') {
    currentView = v;
  },
  get selectedGroupId() {
    return selectedGroupId;
  },
  set selectedGroupId(v: string | null) {
    selectedGroupId = v;
  },
  get selectedNdoId() {
    return selectedNdoId;
  },
  set selectedNdoId(v: ActionHash | null) {
    selectedNdoId = v;
  }
};
