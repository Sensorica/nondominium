import { describe, it, expect, vi } from 'vitest';
import type { AppClient } from '@holochain/client';
import { AppletServices } from '@theweave/api';
import type { NdoAnchorEntry } from '@nondominium/shared-types';
import { createAppletServices } from './applet-services';
import { ndoWal } from './assets';

const seedLibrary = {
  name: 'Seed library',
  ndo_dna_hash: new Uint8Array([1]),
  identity_action_hash: new Uint8Array([2])
} as unknown as NdoAnchorEntry;
const toolShed = {
  name: 'Tool shed',
  ndo_dna_hash: new Uint8Array([3]),
  identity_action_hash: new Uint8Array([4])
} as unknown as NdoAnchorEntry;

const client = { appInfo: vi.fn() } as unknown as AppClient;

describe('createAppletServices without an asset source', () => {
  it('builds a Weave AppletServices object', () => {
    expect(createAppletServices()).toBeInstanceOf(AppletServices);
  });

  it('declares no creatables in v0.1.0', () => {
    expect(createAppletServices().creatables).toEqual({});
  });

  it('has no assets', async () => {
    const services = createAppletServices();
    expect(await services.search(client, new Uint8Array(), {} as never, 'anything')).toEqual([]);
    expect(await services.getAssetInfo(client, ndoWal(seedLibrary))).toBeUndefined();
  });
});

describe('createAppletServices with NDOs as assets', () => {
  const source = { loadAnchors: vi.fn(async () => [seedLibrary, toolShed]) };

  it('finds NDOs by name through the applet client Moss passes', async () => {
    const services = createAppletServices(source);
    const found = await services.search(client, new Uint8Array(), {} as never, 'tool');
    expect(found).toEqual([ndoWal(toolShed)]);
    expect(source.loadAnchors).toHaveBeenCalledWith(client);
  });

  it('names an NDO from its WAL', async () => {
    const info = await createAppletServices(source).getAssetInfo(client, ndoWal(seedLibrary));
    expect(info?.name).toBe('Seed library');
  });

  it('answers undefined for a WAL that is not one of the group NDOs', async () => {
    const stranger = ndoWal({ ndo_dna_hash: new Uint8Array([9]), identity_action_hash: new Uint8Array([9]) });
    expect(await createAppletServices(source).getAssetInfo(client, stranger)).toBeUndefined();
  });
});
