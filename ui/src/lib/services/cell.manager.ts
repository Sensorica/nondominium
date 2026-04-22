import type { AppClient, CellId } from '@holochain/client';

/**
 * Returns the CellId of the Lobby cell if the conductor has one provisioned.
 * Returns null if the Lobby DNA is not installed or the client is unavailable.
 */
export async function getLobbyCellHandle(client: AppClient): Promise<CellId | null> {
  try {
    const appInfo = await client.appInfo();
    const lobbyCell = appInfo?.cell_info?.['lobby']?.[0];
    if (lobbyCell && 'provisioned' in lobbyCell) {
      return lobbyCell.provisioned.cell_id;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Returns the CellId of a Group cell for a given network seed.
 * Returns null until Group DNA ships in issue #101.
 */
export function getGroupCellHandle(): null {
  return null;
}
