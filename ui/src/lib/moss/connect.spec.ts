import { describe, it, expect, vi } from 'vitest';
import type { AppClient } from '@holochain/client';
import { connectMoss, type MossDeps } from './connect';

function fakeDeps(renderInfo: unknown): { deps: MossDeps; calls: string[] } {
  const calls: string[] = [];
  const deps: MossDeps = {
    initializeHotReload: vi.fn(async () => {
      calls.push('hot-reload');
    }),
    connect: vi.fn(async () => {
      calls.push('connect');
      return { renderInfo } as never;
    }),
    createAppletServices: vi.fn(() => ({ marker: 'services' }) as never)
  };
  return { deps, calls };
}

const appletClient = { appInfo: vi.fn() } as unknown as AppClient;
const appletView = {
  type: 'applet-view',
  view: { type: 'main' },
  appletClient,
  groupHash: new Uint8Array([1, 2, 3]),
  appletHash: new Uint8Array([4, 5, 6])
};

describe('connectMoss', () => {
  it('runs hot reload before connecting when the host asks for it', async () => {
    const { deps, calls } = fakeDeps(appletView);
    await connectMoss({ hotReload: true }, deps);
    expect(calls).toEqual(['hot-reload', 'connect']);
  });

  it('skips hot reload in a packaged tool', async () => {
    const { deps, calls } = fakeDeps(appletView);
    await connectMoss({ hotReload: false }, deps);
    expect(calls).toEqual(['connect']);
  });

  it('hands the applet services to the Weave client', async () => {
    const { deps } = fakeDeps(appletView);
    await connectMoss({ hotReload: false }, deps);
    expect(deps.connect).toHaveBeenCalledWith({ marker: 'services' });
  });

  it('prefers the applet services the service layer supplies, so assets can read the group', async () => {
    const { deps } = fakeDeps(appletView);
    const supplied = vi.fn(() => ({ marker: 'with-assets' }) as never);
    await connectMoss({ hotReload: false, appletServices: supplied }, deps);
    expect(deps.connect).toHaveBeenCalledWith({ marker: 'with-assets' });
    expect(deps.createAppletServices).not.toHaveBeenCalled();
  });

  it('returns the applet client and the group the tool instance lives in', async () => {
    const { deps } = fakeDeps(appletView);
    const connection = await connectMoss({ hotReload: false }, deps);
    expect(connection.appClient).toBe(appletClient);
    expect(connection.groupHash).toEqual(new Uint8Array([1, 2, 3]));
    expect(connection.appletHash).toEqual(new Uint8Array([4, 5, 6]));
  });

  it('refuses a cross-group render, which this tool does not implement', async () => {
    const { deps } = fakeDeps({ type: 'cross-group-view', view: { type: 'main' }, applets: new Map() });
    await expect(connectMoss({ hotReload: false }, deps)).rejects.toThrow(/cross-group/i);
  });

  it('surfaces a hot reload failure instead of hanging on connect', async () => {
    const { deps } = fakeDeps(appletView);
    deps.initializeHotReload = vi.fn(async () => {
      throw new Error('no parent frame');
    });
    await expect(connectMoss({ hotReload: true }, deps)).rejects.toThrow(/no parent frame/);
    expect(deps.connect).not.toHaveBeenCalled();
  });
});
