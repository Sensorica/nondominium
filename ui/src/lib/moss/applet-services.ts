import type { AppClient } from '@holochain/client';
import { AppletServices } from '@theweave/api';
import type { NdoAnchorEntry } from '@nondominium/shared-types';
import { ndoAssetInfo, searchNdoAssets } from './assets';

/** Where the asset services read the NDOs of the group from. */
export interface AssetSource {
  loadAnchors(client: AppClient): Promise<NdoAnchorEntry[]>;
}

/**
 * What Nondominium tells Moss about itself. NDOs are the tool's assets:
 * `search` finds them by name and `getAssetInfo` names one. Opening an asset
 * is not a method here: Moss renders the tool with an asset view and the UI
 * opens the NDO (`view.ts`). Without a source the tool has no assets, which is
 * how the unit tests and the bare scaffold use it.
 */
export function createAppletServices(source?: AssetSource): AppletServices {
  const services = new AppletServices();
  if (!source) return services;
  services.search = async (appletClient, _appletHash, _weaveServices, searchFilter) =>
    searchNdoAssets(await source.loadAnchors(appletClient), searchFilter);
  services.getAssetInfo = async (appletClient, wal) =>
    ndoAssetInfo(await source.loadAnchors(appletClient), wal);
  return services;
}
