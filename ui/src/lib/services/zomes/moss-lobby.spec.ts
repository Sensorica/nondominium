import { describe, it, expect, vi } from 'vitest';
import { Effect as E, Exit } from 'effect';
import { encodeHashToBase64, type CellId } from '@holochain/client';
import { MOSS_GROUP_ID } from '$lib/moss/group-cell';
import { createMossLobbyService, type MossLobbyDeps } from './moss-lobby';

const dna = new Uint8Array([1, 2, 3]);
const me = new Uint8Array([9, 9, 9]);
const cellId: CellId = [dna, me];
const groupHash = new Uint8Array([5, 5, 5]);

const cell = { networkSeed: 'instance-seed', dnaHash: dna, cellId, cloneId: 'group', enabled: true };

function groupRecord(name: string) {
  return {
    signed_action: { hashed: { hash: groupHash, content: { header: { author: me, timestamp: 1 } } } },
    entry: { Present: { entry: { name, description: 'Pilot group' } } }
  };
}

interface Fake {
  deps: MossLobbyDeps;
  zomeCalls: Array<{ fn: string; payload: unknown }>;
}

/** A group cell that starts empty (or with a profile), recording every zome call. */
function fake(options: { installer: boolean; existingProfile?: boolean; member?: boolean; appearsAfter?: number }): Fake {
  const zomeCalls: Fake['zomeCalls'] = [];
  let profilePresent = options.existingProfile ?? false;
  let getMyGroupCalls = 0;
  const deps: MossLobbyDeps = {
    getGroupCell: async () => cell,
    callGroupZome: (async (_cellId: CellId, fn: string, payload: unknown) => {
      zomeCalls.push({ fn, payload });
      if (fn === 'get_my_group') {
        getMyGroupCalls += 1;
        if (options.appearsAfter !== undefined && getMyGroupCalls > options.appearsAfter) profilePresent = true;
        return profilePresent ? groupRecord('Nondominium Pilot') : null;
      }
      if (fn === 'create_group') {
        profilePresent = true;
        return groupRecord((payload as { name: string }).name);
      }
      if (fn === 'is_member') return options.member ?? false;
      return groupRecord('Nondominium Pilot');
    }) as MossLobbyDeps['callGroupZome'],
    myAgentPubKey: async () => me,
    mossGroupName: async () => 'Nondominium Pilot',
    isToolInstaller: async () => options.installer,
    sleep: vi.fn(async () => {})
  };
  return { deps, zomeCalls };
}

const run = <A, Err>(effect: E.Effect<A, Err>) => E.runPromiseExit(effect);

describe('Moss lobby service', () => {
  it('shows exactly one group, the tool instance group cell', async () => {
    const { deps } = fake({ installer: true, existingProfile: true });
    const groups = await E.runPromise(createMossLobbyService(deps).getMyGroups());
    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({
      id: MOSS_GROUP_ID,
      name: 'Nondominium Pilot',
      networkSeed: 'instance-seed',
      groupHash: encodeHashToBase64(groupHash)
    });
  });

  it('lets the tool installer create the group profile and join it, with no invite code', async () => {
    const { deps, zomeCalls } = fake({ installer: true });
    await E.runPromise(createMossLobbyService(deps).getMyGroups());
    const fns = zomeCalls.map((c) => c.fn);
    expect(fns).toContain('create_group');
    expect(fns).toContain('join_group');
    expect(zomeCalls.find((c) => c.fn === 'create_group')?.payload).toEqual({
      name: 'Nondominium Pilot',
      description: null
    });
  });

  it('resolves the group once when every store asks at the same time, so commits never race', async () => {
    const { deps, zomeCalls } = fake({ installer: true });
    const service = createMossLobbyService(deps);
    await Promise.all([
      E.runPromise(service.getMyGroups()),
      E.runPromise(service.getMyGroups()),
      E.runPromise(service.ensureMembership(MOSS_GROUP_ID)),
      E.runPromise(service.getMyGroups())
    ]);
    expect(zomeCalls.filter((c) => c.fn === 'create_group')).toHaveLength(1);
    expect(zomeCalls.filter((c) => c.fn === 'join_group')).toHaveLength(1);
    // A resolved group is kept: later calls touch the conductor no more.
    const before = zomeCalls.length;
    await E.runPromise(service.getMyGroups());
    expect(zomeCalls.length).toBe(before);
  });

  it('never creates a second profile when the group already has one', async () => {
    const { deps, zomeCalls } = fake({ installer: true, existingProfile: true });
    await E.runPromise(createMossLobbyService(deps).getMyGroups());
    expect(zomeCalls.map((c) => c.fn)).not.toContain('create_group');
  });

  it('makes a member wait for the installer profile to gossip, then join it automatically', async () => {
    const { deps, zomeCalls } = fake({ installer: false, appearsAfter: 3 });
    const groups = await E.runPromise(createMossLobbyService(deps).getMyGroups());
    expect(groups).toHaveLength(1);
    expect(zomeCalls.map((c) => c.fn)).not.toContain('create_group');
    expect(deps.sleep).toHaveBeenCalled();
    expect(zomeCalls.filter((c) => c.fn === 'join_group')).toHaveLength(1);
  });

  it('shows no group yet, without failing, while a member is still waiting for the profile', async () => {
    const { deps } = fake({ installer: false });
    const groups = await E.runPromise(createMossLobbyService(deps).getMyGroups());
    expect(groups).toEqual([]);
  });

  it('refuses to create or join groups, which Moss owns', async () => {
    const { deps } = fake({ installer: true });
    const service = createMossLobbyService(deps);
    const exits: Array<Exit.Exit<unknown, unknown>> = [
      await run(service.createGroup('Another')),
      await run(service.joinGroup('invite-code')),
      await run(service.generateInviteLink(MOSS_GROUP_ID))
    ];
    for (const exit of exits) {
      expect(Exit.isFailure(exit)).toBe(true);
      expect(JSON.stringify(exit)).toMatch(/managed by Moss/i);
    }
  });

  it('resolves the group cell and hash only for the Moss group id', async () => {
    const { deps } = fake({ installer: true, existingProfile: true });
    const service = createMossLobbyService(deps);
    expect(await E.runPromise(service.getGroupCell(MOSS_GROUP_ID))).toEqual(cell);
    expect(await E.runPromise(service.getGroupCell('some-clone-seed'))).toBeNull();
    expect(await E.runPromise(service.getGroupHash(MOSS_GROUP_ID))).toBe(encodeHashToBase64(groupHash));
    expect(await E.runPromise(service.getGroupHash('some-clone-seed'))).toBeNull();
  });

  it('joins the group once when membership is missing, and not again when present', async () => {
    const missing = fake({ installer: false, existingProfile: true, member: false });
    expect(await E.runPromise(createMossLobbyService(missing.deps).ensureMembership(MOSS_GROUP_ID))).toBe(true);
    expect(missing.zomeCalls.filter((c) => c.fn === 'join_group')).toHaveLength(1);

    const present = fake({ installer: false, existingProfile: true, member: true });
    expect(await E.runPromise(createMossLobbyService(present.deps).ensureMembership(MOSS_GROUP_ID))).toBe(true);
    expect(present.zomeCalls.map((c) => c.fn)).not.toContain('join_group');
  });

  it('answers the standalone Lobby DHT calls with nothing, since Moss replaces the Lobby', async () => {
    const { deps, zomeCalls } = fake({ installer: true });
    const service = createMossLobbyService(deps);
    expect(await E.runPromise(service.getAllGroupAnnouncements())).toEqual([]);
    expect(await E.runPromise(service.getMyGroupAnnouncements())).toEqual([]);
    expect(await E.runPromise(service.getLobbyAgentProfile(me))).toBeNull();
    await E.runPromise(service.announceGroup({} as never));
    await E.runPromise(service.upsertLobbyAgentProfile({ handle: 'x' } as never));
    expect(zomeCalls).toEqual([]);
  });
});
