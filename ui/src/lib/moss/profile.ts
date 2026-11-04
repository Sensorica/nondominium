import { encodeHashToBase64, type AgentPubKey, type DnaHash } from '@holochain/client';
import type { LobbyUserProfile } from '@nondominium/shared-types';

/** The Moss group roles this tool knows. */
export type MossRoleName = 'Member' | 'Steward' | 'Progenitor';

const ROLE_ORDER: readonly MossRoleName[] = ['Member', 'Steward', 'Progenitor'];

/** The slice of the Moss profiles client this module uses. */
export interface MossProfilesApi {
  getAgentProfile(
    agent: AgentPubKey
  ): Promise<{ entry: { nickname: string; fields: Record<string, string> } } | undefined>;
}

/** The slice of the WeaveClient this module uses. */
export interface MossAccountabilitiesApi {
  myAccountabilitiesPerGroup(): Promise<Array<[DnaHash, Array<{ role: { name: string } }>]>>;
}

/**
 * The agent's Moss profile, in the shape the UI already uses for the standalone
 * Lobby profile. Null when there is none yet or Moss cannot answer: the caller
 * falls back to a nickname rather than blocking on a profile.
 */
export async function loadMossProfile(
  profiles: MossProfilesApi,
  agent: AgentPubKey
): Promise<LobbyUserProfile | null> {
  try {
    const record = await profiles.getAgentProfile(agent);
    if (!record) return null;
    const { nickname, fields } = record.entry;
    return { nickname, ...(fields.bio ? { bio: fields.bio } : {}) };
  } catch (error) {
    console.warn('[moss] could not read the Moss profile:', error);
    return null;
  }
}

function isKnownRole(name: string): name is MossRoleName {
  return (ROLE_ORDER as readonly string[]).includes(name);
}

/** The agent's roles in the Moss group the tool instance lives in. */
export async function loadMyRoles(
  weave: MossAccountabilitiesApi,
  groupHash: DnaHash | null
): Promise<MossRoleName[]> {
  if (!groupHash) return [];
  const wanted = encodeHashToBase64(groupHash);
  const perGroup = await weave.myAccountabilitiesPerGroup();
  const entry = perGroup.find(([hash]) => encodeHashToBase64(hash) === wanted);
  if (!entry) return [];
  return entry[1].map((accountability) => accountability.role.name).filter(isKnownRole);
}

export function strongestRole(roles: readonly MossRoleName[]): MossRoleName | null {
  let best: MossRoleName | null = null;
  for (const role of roles) {
    if (best === null || ROLE_ORDER.indexOf(role) > ROLE_ORDER.indexOf(best)) best = role;
  }
  return best;
}
