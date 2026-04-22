import type { ActionHash, AgentPubKey } from '@holochain/client';
import type { LobbyUserProfile, Person } from '@nondominium/shared-types';

const LOBBY_PROFILE_KEY = 'ndo_lobby_profile_v1';

function loadProfileFromStorage(): LobbyUserProfile | null {
  try {
    const raw = localStorage.getItem(LOBBY_PROFILE_KEY);
    return raw ? (JSON.parse(raw) as LobbyUserProfile) : null;
  } catch {
    return null;
  }
}

let myAgentPubKey = $state<AgentPubKey | null>(null);
let myPerson = $state<Person | null>(null);
let currentView = $state<'lobby' | 'group' | 'ndo'>('lobby');
let selectedGroupId = $state<string | null>(null);
let selectedNdoId = $state<ActionHash | null>(null);
let lobbyUserProfile = $state<LobbyUserProfile | null>(loadProfileFromStorage());

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
  },
  get lobbyUserProfile() {
    return lobbyUserProfile;
  },
  set lobbyUserProfile(v: LobbyUserProfile | null) {
    lobbyUserProfile = v;
    try {
      if (v) {
        localStorage.setItem(LOBBY_PROFILE_KEY, JSON.stringify(v));
      } else {
        localStorage.removeItem(LOBBY_PROFILE_KEY);
      }
    } catch {
      // localStorage not available
    }
  }
};
