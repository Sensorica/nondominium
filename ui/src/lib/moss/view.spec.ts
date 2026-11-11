import { describe, it, expect } from 'vitest';
import { encodeHashToBase64 } from '@holochain/client';
import { initialMossPath, type MossRenderInfo } from './view';

const dna = new Uint8Array([1, 2, 3]);
const identity = new Uint8Array([4, 5, 6]);
const wal = { hrl: [dna, identity] };

describe('initialMossPath', () => {
  it('opens the NDO an asset view was asked for', () => {
    const info = { type: 'applet-view', view: { type: 'asset', wal } } as unknown as MossRenderInfo;
    expect(initialMossPath(info)).toBe(`/ndo/${encodeHashToBase64(identity)}`);
  });

  it('opens the NDO when Moss opens the main view on a WAL (openAppletMain with a WAL)', () => {
    const info = { type: 'applet-view', view: { type: 'main', wal } } as unknown as MossRenderInfo;
    expect(initialMossPath(info)).toBe(`/ndo/${encodeHashToBase64(identity)}`);
  });

  it('stays on the default page for a plain main view', () => {
    const info = { type: 'applet-view', view: { type: 'main' } } as unknown as MossRenderInfo;
    expect(initialMossPath(info)).toBeNull();
  });

  it('has no path for a creatable or a cross-group view', () => {
    const creatable = { type: 'applet-view', view: { type: 'creatable', name: 'x' } } as unknown as MossRenderInfo;
    const crossGroup = { type: 'cross-group-view', view: { type: 'main' } } as unknown as MossRenderInfo;
    expect(initialMossPath(creatable)).toBeNull();
    expect(initialMossPath(crossGroup)).toBeNull();
  });
});
