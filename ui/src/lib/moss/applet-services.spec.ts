import { describe, it, expect } from 'vitest';
import { AppletServices } from '@theweave/api';
import { createAppletServices } from './applet-services';

describe('createAppletServices', () => {
  it('builds a Weave AppletServices object', () => {
    expect(createAppletServices()).toBeInstanceOf(AppletServices);
  });

  it('declares no creatables in v0.1.0', () => {
    expect(createAppletServices().creatables).toEqual({});
  });

  it('answers search with no assets until NDOs are exposed as assets', async () => {
    const services = createAppletServices();
    const result = await services.search({} as never, new Uint8Array(), {} as never, 'anything');
    expect(result).toEqual([]);
  });

  it('answers getAssetInfo with nothing until NDOs are exposed as assets', async () => {
    const services = createAppletServices();
    const result = await services.getAssetInfo({} as never, { hrl: [new Uint8Array(), new Uint8Array()] });
    expect(result).toBeUndefined();
  });
});
