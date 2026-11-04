import { describe, it, expect } from 'vitest';
import { encodeHashToBase64 } from '@holochain/client';
import type { NdoAnchorEntry } from '@nondominium/shared-types';
import {
  NDO_ICON_SRC,
  findAnchorForWal,
  ndoAssetInfo,
  ndoPath,
  ndoWal,
  searchNdoAssets,
  walToNdo
} from './assets';

const dnaA = new Uint8Array([1, 1, 1]);
const dnaB = new Uint8Array([2, 2, 2]);
const identityA = new Uint8Array([10, 10, 10]);
const identityB = new Uint8Array([20, 20, 20]);

function anchor(name: string, dna: Uint8Array, identity: Uint8Array): NdoAnchorEntry {
  return { name, ndo_dna_hash: dna, identity_action_hash: identity } as unknown as NdoAnchorEntry;
}

const seedLibrary = anchor('Seed library', dnaA, identityA);
const toolShed = anchor('Tool shed', dnaB, identityB);

describe('ndoWal', () => {
  it('addresses an NDO by its clone DNA and its identity record', () => {
    const wal = ndoWal(seedLibrary);
    expect(wal.hrl[0]).toEqual(dnaA);
    expect(wal.hrl[1]).toEqual(identityA);
  });

  it('round-trips through walToNdo', () => {
    expect(walToNdo(ndoWal(toolShed))).toEqual({ dnaHash: dnaB, identityActionHash: identityB });
  });
});

describe('ndoPath', () => {
  it('opens the NDO detail route, keyed by the identity action hash', () => {
    expect(ndoPath(ndoWal(seedLibrary))).toBe(`/ndo/${encodeHashToBase64(identityA)}`);
  });
});

describe('findAnchorForWal', () => {
  it('finds the anchor that matches both hashes of the WAL', () => {
    expect(findAnchorForWal([seedLibrary, toolShed], ndoWal(toolShed))).toBe(toolShed);
  });

  it('does not match on the identity alone when the DNA differs', () => {
    const stranger = { hrl: [dnaB, identityA] } as never;
    expect(findAnchorForWal([seedLibrary, toolShed], stranger)).toBeUndefined();
  });
});

describe('ndoAssetInfo', () => {
  it('answers with the NDO name and an icon', () => {
    expect(ndoAssetInfo([seedLibrary], ndoWal(seedLibrary))).toEqual({
      name: 'Seed library',
      icon_src: NDO_ICON_SRC
    });
  });

  it('answers undefined for an NDO this group does not anchor', () => {
    expect(ndoAssetInfo([seedLibrary], ndoWal(toolShed))).toBeUndefined();
  });

  it('uses an icon Moss can render inline', () => {
    expect(NDO_ICON_SRC.startsWith('data:image/')).toBe(true);
  });
});

describe('searchNdoAssets', () => {
  const anchors = [seedLibrary, toolShed];

  it('returns the WALs of NDOs whose name contains the filter, ignoring case', () => {
    expect(searchNdoAssets(anchors, 'SEED')).toEqual([ndoWal(seedLibrary)]);
    expect(searchNdoAssets(anchors, 'o')).toEqual([ndoWal(toolShed)]);
  });

  it('returns every NDO for an empty filter', () => {
    expect(searchNdoAssets(anchors, '')).toHaveLength(2);
  });

  it('returns nothing when no name matches', () => {
    expect(searchNdoAssets(anchors, 'tractor')).toEqual([]);
  });
});
