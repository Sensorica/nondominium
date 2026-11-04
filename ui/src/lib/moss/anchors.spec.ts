import { describe, it, expect, vi } from 'vitest';
import { CellType, type AppClient } from '@holochain/client';
import { loadGroupAnchors } from './anchors';

const dna = new Uint8Array([1, 2, 3]);
const me = new Uint8Array([9, 9, 9]);
const groupHash = new Uint8Array([5, 5, 5]);

const groupRecord = {
  signed_action: { hashed: { hash: groupHash, content: { header: { author: me, timestamp: 1 } } } },
  entry: { Present: { entry: { name: 'Pilot' } } }
};

function anchorRecord(name: string, ndoDna: Uint8Array, identity: Uint8Array) {
  return {
    signed_action: { hashed: { hash: new Uint8Array([7]), content: { header: { author: me, timestamp: 1 } } } },
    entry: {
      Present: {
        entry: { name, ndo_dna_hash: ndoDna, identity_action_hash: identity, network_seed: `seed_${name}` }
      }
    }
  };
}

function client(calls: Record<string, unknown>) {
  const callZome = vi.fn(async (request: { fn_name: string }) => calls[request.fn_name]);
  const appInfo = vi.fn(async () => ({
    cell_info: {
      group: [{ type: CellType.Provisioned, value: { cell_id: [dna, me], dna_modifiers: { network_seed: 's' } } }]
    }
  }));
  return { callZome, appInfo, instance: { callZome, appInfo } as unknown as AppClient };
}

describe('loadGroupAnchors', () => {
  it('reads the NDO anchors of the instance group cell through the applet client', async () => {
    const { instance, callZome } = client({
      get_my_group: groupRecord,
      get_ndo_anchors: [anchorRecord('Seed library', new Uint8Array([1]), new Uint8Array([2]))]
    });
    const anchors = await loadGroupAnchors(instance);
    expect(anchors.map((a) => a.name)).toEqual(['Seed library']);
    const fns = callZome.mock.calls.map(([request]) => (request as { fn_name: string }).fn_name);
    expect(fns).toEqual(['get_my_group', 'get_ndo_anchors']);
    const first = callZome.mock.calls[0]?.[0] as unknown as { cell_id: unknown; zome_name: string };
    expect(first.zome_name).toBe('zome_group');
    expect(first.cell_id).toEqual([dna, me]);
  });

  it('skips anchors that lack clone coordinates', async () => {
    const { instance } = client({
      get_my_group: groupRecord,
      get_ndo_anchors: [
        anchorRecord('Good', new Uint8Array([1]), new Uint8Array([2])),
        { signed_action: groupRecord.signed_action, entry: { Present: { entry: { name: 'Broken' } } } }
      ]
    });
    expect((await loadGroupAnchors(instance)).map((a) => a.name)).toEqual(['Good']);
  });

  it('answers nothing before the group profile has synced', async () => {
    const { instance, callZome } = client({ get_my_group: null });
    expect(await loadGroupAnchors(instance)).toEqual([]);
    expect(callZome).toHaveBeenCalledTimes(1);
  });

  it('answers nothing when the app has no group cell', async () => {
    const instance = { appInfo: async () => ({ cell_info: {} }), callZome: vi.fn() } as unknown as AppClient;
    expect(await loadGroupAnchors(instance)).toEqual([]);
  });
});
