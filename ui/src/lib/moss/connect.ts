import type { AppClient, DnaHash, EntryHash } from '@holochain/client';
import {
  initializeHotReload as weaveInitializeHotReload,
  WeaveClient,
  type AppletServices
} from '@theweave/api';
import { createAppletServices } from './applet-services';

export interface MossConnection {
  weaveClient: WeaveClient;
  /** The conductor client Moss hands the tool. Signing is handled by Moss. */
  appClient: AppClient;
  /** Hash of the Moss group this tool instance is installed in. */
  groupHash: DnaHash | null;
  appletHash: EntryHash;
}

/** The Weave calls this module makes, injectable so the seam is testable. */
export interface MossDeps {
  initializeHotReload: () => Promise<void>;
  connect: (services: AppletServices) => Promise<WeaveClient>;
  createAppletServices: () => AppletServices;
}

const defaultDeps: MossDeps = {
  initializeHotReload: weaveInitializeHotReload,
  connect: (services) => WeaveClient.connect(services),
  createAppletServices
};

/**
 * Connects to Moss. `hotReload` is true in `weave` dev mode, where the tool is
 * served from localhost: Moss only injects its API after the tool asks for the
 * iframe script, and `WeaveClient.connect` waits for that forever otherwise.
 */
export async function connectMoss(
  options: { hotReload: boolean },
  deps: MossDeps = defaultDeps
): Promise<MossConnection> {
  if (options.hotReload) {
    await deps.initializeHotReload();
  }
  const weaveClient = await deps.connect(deps.createAppletServices());
  const info = weaveClient.renderInfo;
  if (info.type !== 'applet-view') {
    throw new Error('Nondominium does not implement the Moss cross-group view.');
  }
  return {
    weaveClient,
    appClient: info.appletClient,
    groupHash: info.groupHash,
    appletHash: info.appletHash
  };
}
