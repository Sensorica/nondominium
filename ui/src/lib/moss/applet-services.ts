import { AppletServices } from '@theweave/api';

/**
 * What Nondominium tells Moss about itself. v0.1.0 scaffold: no creatables and
 * no assets. NDOs become assets (`search`, `getAssetInfo`) in the asset slice.
 */
export function createAppletServices(): AppletServices {
  return new AppletServices();
}
