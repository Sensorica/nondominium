import { describe, it, expect } from 'vitest';
import { detectHost, type HostEnv } from './host';

const standaloneEnv: HostEnv = {
  protocol: 'http:',
  hasWeaveApi: false,
  isTopWindow: true,
  hash: '',
  dev: true
};

describe('detectHost', () => {
  it('reports standalone for a top-level page with no Weave marker', () => {
    expect(detectHost(standaloneEnv)).toEqual({ mode: 'standalone' });
  });

  it('reports Moss without hot reload when served from the applet:// protocol', () => {
    expect(detectHost({ ...standaloneEnv, protocol: 'applet:', isTopWindow: false, dev: false })).toEqual({
      mode: 'moss',
      hotReload: false
    });
  });

  it('reports Moss without hot reload once the Weave API is already injected', () => {
    expect(detectHost({ ...standaloneEnv, hasWeaveApi: true, isTopWindow: false })).toEqual({
      mode: 'moss',
      hotReload: false
    });
  });

  it('reports Moss with hot reload for a dev-server iframe carrying the iframe-kind hash', () => {
    expect(detectHost({ ...standaloneEnv, isTopWindow: false, hash: '#gqR0eXBlpWFwcGxldA' })).toEqual({
      mode: 'moss',
      hotReload: true
    });
  });

  it('stays standalone for an iframe with no hash (some other embedder)', () => {
    expect(detectHost({ ...standaloneEnv, isTopWindow: false, hash: '' })).toEqual({
      mode: 'standalone'
    });
  });

  it('stays standalone for a top-level page that happens to carry a hash', () => {
    expect(detectHost({ ...standaloneEnv, hash: '#section' })).toEqual({ mode: 'standalone' });
  });

  it('stays standalone for an iframe with a hash outside dev mode', () => {
    expect(
      detectHost({ ...standaloneEnv, isTopWindow: false, hash: '#gqR0eXBlpWFwcGxldA', dev: false })
    ).toEqual({ mode: 'standalone' });
  });
});
