import { describe, it, expect } from 'vitest';
import { loadMossProfile, loadMyRoles, strongestRole } from './profile';

const agent = new Uint8Array([7, 7, 7]);
const groupA = new Uint8Array([1, 1, 1]);
const groupB = new Uint8Array([2, 2, 2]);

describe('loadMossProfile', () => {
  it('maps the Moss profile to the UI profile, nickname first', async () => {
    const profiles = {
      getAgentProfile: async () => ({ entry: { nickname: 'Alice', fields: { bio: 'Steward of tools' } } })
    };
    expect(await loadMossProfile(profiles, agent)).toEqual({ nickname: 'Alice', bio: 'Steward of tools' });
  });

  it('omits the bio when the Moss profile has none', async () => {
    const profiles = { getAgentProfile: async () => ({ entry: { nickname: 'Bob', fields: {} } }) };
    expect(await loadMossProfile(profiles, agent)).toEqual({ nickname: 'Bob' });
  });

  it('returns null when the agent has no Moss profile yet', async () => {
    const profiles = { getAgentProfile: async () => undefined };
    expect(await loadMossProfile(profiles, agent)).toBeNull();
  });

  it('returns null instead of throwing when the profile lookup fails', async () => {
    const profiles = {
      getAgentProfile: async () => {
        throw new Error('profiles zome unreachable');
      }
    };
    expect(await loadMossProfile(profiles, agent)).toBeNull();
  });
});

describe('loadMyRoles', () => {
  const weave = {
    myAccountabilitiesPerGroup: async () =>
      [
        [groupA, [{ role: { name: 'Member' } }, { role: { name: 'Steward' } }]],
        [groupB, [{ role: { name: 'Progenitor' } }]]
      ] as never
  };

  it('returns the role names for the group the tool instance lives in', async () => {
    expect(await loadMyRoles(weave, groupA)).toEqual(['Member', 'Steward']);
    expect(await loadMyRoles(weave, groupB)).toEqual(['Progenitor']);
  });

  it('returns no roles for a group the agent has none in, or no group', async () => {
    expect(await loadMyRoles(weave, new Uint8Array([3, 3, 3]))).toEqual([]);
    expect(await loadMyRoles(weave, null)).toEqual([]);
  });

  it('ignores role names this tool does not know', async () => {
    const odd = {
      myAccountabilitiesPerGroup: async () => [[groupA, [{ role: { name: 'Janitor' } }]]] as never
    };
    expect(await loadMyRoles(odd, groupA)).toEqual([]);
  });
});

describe('strongestRole', () => {
  it('orders Progenitor over Steward over Member', () => {
    expect(strongestRole(['Member', 'Steward'])).toBe('Steward');
    expect(strongestRole(['Member', 'Progenitor', 'Steward'])).toBe('Progenitor');
    expect(strongestRole(['Member'])).toBe('Member');
  });

  it('is null with no role', () => {
    expect(strongestRole([])).toBeNull();
  });
});
