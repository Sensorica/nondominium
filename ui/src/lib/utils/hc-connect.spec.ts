import { describe, it, expect, vi, beforeEach } from 'vitest';

const detectCurrentHost = vi.fn();
const connectMoss = vi.fn();
const appWebsocketConnect = vi.fn();

vi.mock('@holochain/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@holochain/client')>()),
  AppWebsocket: { connect: (...args: unknown[]) => appWebsocketConnect(...args) }
}));

vi.mock('../moss/host', () => ({ detectCurrentHost: () => detectCurrentHost() }));
vi.mock('../moss/connect', () => ({
  connectMoss: (options: { hotReload: boolean }) => connectMoss(options)
}));

import { connectHolochainClient } from './hc-connect';

describe('connectHolochainClient', () => {
  beforeEach(() => {
    detectCurrentHost.mockReset();
    connectMoss.mockReset();
  });

  it('connects through Moss, not through the sandbox manifest, when hosted by Moss', async () => {
    const appClient = { appInfo: vi.fn() };
    const weaveClient = { renderInfo: {} };
    detectCurrentHost.mockReturnValue({ mode: 'moss', hotReload: true });
    connectMoss.mockResolvedValue({
      appClient,
      weaveClient,
      groupHash: new Uint8Array([9]),
      appletHash: new Uint8Array([8])
    });

    const result = await connectHolochainClient('nondominium');

    expect(connectMoss).toHaveBeenCalledWith({ hotReload: true });
    expect(result.connectionMode).toBe('moss');
    expect(result.client).toBe(appClient);
    expect(result.moss?.weaveClient).toBe(weaveClient);
    expect(result.adminWsUrl).toBeUndefined();
  });

  it('hands the applet services of the service layer to the Moss connection', async () => {
    const appletServices = () => ({ marker: 'with-assets' }) as never;
    detectCurrentHost.mockReturnValue({ mode: 'moss', hotReload: false });
    connectMoss.mockResolvedValue({ appClient: {}, weaveClient: {}, groupHash: null, appletHash: new Uint8Array() });

    await connectHolochainClient('nondominium', appletServices);

    expect(connectMoss).toHaveBeenCalledWith({ hotReload: false, appletServices });
  });

  it('never touches Moss when running standalone', async () => {
    detectCurrentHost.mockReturnValue({ mode: 'standalone' });
    const standaloneClient = { appInfo: vi.fn() };
    appWebsocketConnect.mockResolvedValue(standaloneClient);
    vi.stubGlobal('window', {
      __HC_LAUNCHER_ENV__: { APP_INTERFACE_PORT: 4242, INSTALLED_APP_ID: 'nondominium', APP_INTERFACE_TOKEN: [1] }
    });

    const result = await connectHolochainClient('nondominium');

    expect(connectMoss).not.toHaveBeenCalled();
    expect(result.connectionMode).toBe('launcher');
    expect(result.client).toBe(standaloneClient);
    expect(result.moss).toBeUndefined();
    vi.unstubAllGlobals();
  });
});
