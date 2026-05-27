import type { AppClient, CellId, DnaHash } from '@holochain/client';
import { encodeHashToBase64 } from '@holochain/client';

/**
 * Returns the CellId of the Lobby cell if the conductor has one provisioned.
 * Returns null if the Lobby DNA is not installed or the client is unavailable.
 */
export async function getLobbyCellHandle(client: AppClient): Promise<CellId | null> {
  try {
    const appInfo = await client.appInfo();
    const lobbyCell = appInfo?.cell_info?.['lobby']?.[0] as Record<string, unknown> | undefined;
    if (lobbyCell && 'provisioned' in lobbyCell) {
      const provisioned = lobbyCell.provisioned as { cell_id: CellId };
      return provisioned.cell_id;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Returns the CellId of a Group cloned cell matching the given DNA hash.
 *
 * Groups use the cloned-cell pattern: each group has its own DHT. The CellId
 * (DnaHash + AgentPubKey) is the correct Holochain API to address a cloned cell.
 * The DnaHash encodes the template DNA hash + network seed and is stable per group.
 *
 * Returns null if no matching group cell is found.
 */
export async function getGroupCellHandle(
  client: AppClient,
  dnaHash: DnaHash
): Promise<CellId | null> {
  try {
    const appInfo = await client.appInfo();
    const groupCells = appInfo?.cell_info?.['group'];
    if (!groupCells) return null;

    const targetHashB64 = encodeHashToBase64(dnaHash);
    for (const cellInfo of groupCells) {
      if (cellInfo && typeof cellInfo === 'object' && 'cloned' in cellInfo) {
        const cloned = (cellInfo as { cloned: { cell_id: CellId } }).cloned;
        const [cellDnaHash] = cloned.cell_id;
        if (encodeHashToBase64(cellDnaHash) === targetHashB64) {
          return cloned.cell_id;
        }
      }
    }
    return null;
  } catch {
    return null;
  }
}
