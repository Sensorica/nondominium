import { describe, it, expect, vi } from 'vitest';
import type { ClonedCell } from '@holochain/client';
import type { NdoDnaProperties } from '@nondominium/shared-types';
import { PUBLIC_NDO_CLONES, createNdoCloneViaWeave } from './ndo-clone';

const properties: NdoDnaProperties = {
  name: 'Seed library',
  property_regime: 'Commons',
  resource_nature: 'Physical',
  created_at: 1793754000000000
};
const cloned = { cell_id: [new Uint8Array([1]), new Uint8Array([2])], clone_id: 'ndo.3' } as unknown as ClonedCell;

describe('createNdoCloneViaWeave', () => {
  it('asks the WeaveClient, never the applet client, for the clone', async () => {
    const weave = { createCloneCell: vi.fn(async (_req: unknown, _public: boolean) => cloned) };
    const result = await createNdoCloneViaWeave(weave, { networkSeed: 'ndo_seed', properties });
    expect(result).toBe(cloned);
    expect(weave.createCloneCell).toHaveBeenCalledTimes(1);
  });

  it('requests the ndo role with the seed and plain-object DNA properties', async () => {
    const weave = { createCloneCell: vi.fn(async (_req: unknown, _public: boolean) => cloned) };
    await createNdoCloneViaWeave(weave, { networkSeed: 'ndo_seed', properties });
    const [request] = weave.createCloneCell.mock.calls[0] as unknown as [
      { role_name: string; name: string; modifiers: { network_seed: string; properties: unknown } }
    ];
    expect(request.role_name).toBe('ndo');
    expect(request.name).toBe('Seed library');
    expect(request.modifiers.network_seed).toBe('ndo_seed');
    expect(request.modifiers.properties).toEqual(properties);
    expect(request.modifiers.properties).not.toBeInstanceOf(Uint8Array);
  });

  it('keeps NDO clones private to the instance: Moss cannot register a public clone that has DNA properties', async () => {
    // Moss 0.16.0-rc.5: join_cloned_cell declares `properties: Option<SerializedBytes>` and the
    // renderer forwards the properties object untouched, so any properties fail to deserialize
    // and leave an orphan cell. Flip this when Moss accepts them (issue #162).
    expect(PUBLIC_NDO_CLONES).toBe(false);
    const weave = { createCloneCell: vi.fn(async (_req: unknown, _public: boolean) => cloned) };
    await createNdoCloneViaWeave(weave, { networkSeed: 'ndo_seed', properties });
    expect(weave.createCloneCell.mock.calls[0]?.[1]).toBe(false);
  });

  it('passes an explicit public flag through', async () => {
    const weave = { createCloneCell: vi.fn(async (_req: unknown, _public: boolean) => cloned) };
    await createNdoCloneViaWeave(weave, { networkSeed: 'ndo_seed', properties }, true);
    expect(weave.createCloneCell.mock.calls[0]?.[1]).toBe(true);
  });

  it('propagates a Moss failure to the caller', async () => {
    const weave = {
      createCloneCell: vi.fn(async () => {
        throw new Error('Wasm runtime error');
      })
    };
    await expect(createNdoCloneViaWeave(weave, { networkSeed: 's', properties })).rejects.toThrow('Wasm runtime error');
  });
});
