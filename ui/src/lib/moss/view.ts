import type { RenderInfo } from '@theweave/api';
import { ndoPath } from './assets';

export type MossRenderInfo = RenderInfo;

/**
 * Where the UI should open when Moss asks for a specific NDO: the asset view
 * (`openAsset` from another tool) and the main view opened on a WAL
 * (`openAppletMain` with a WAL) both name an NDO. Null for a plain main view,
 * a creatable or the cross-group view, which keep the default page.
 */
export function initialMossPath(info: MossRenderInfo): string | null {
  if (info.type !== 'applet-view') return null;
  const view = info.view;
  if (view.type === 'asset') return ndoPath(view.wal);
  if (view.type === 'main' && view.wal) return ndoPath(view.wal);
  return null;
}
