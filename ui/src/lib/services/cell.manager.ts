import type { AppClient, CellId, DnaHash, AppInfo } from '@holochain/client';
import { encodeHashToBase64 } from '@holochain/client';
import type { NdoCellProperties, PropertyRegime, ResourceNature } from '@nondominium/shared-types';
import {
  getGroupCellByNetworkSeed,
  listGroupCells,
  listNdoCells,
  type GroupCellInfo
} from './group-clone.helpers';

export type { GroupCellInfo };

/**
 * Constructs the immutable Layer 0 DNA properties for an NDO clone (ADR-010).
 * Single construction point so the msgpack field order — part of the DnaHash
 * derivation — is identical for creators and joiners.
 */
export function ndoCellProperties(
  name: string,
  initiator: Uint8Array,
  propertyRegime: PropertyRegime,
  resourceNature: ResourceNature,
  createdAtMicros: number
): NdoCellProperties {
  return {
    name,
    initiator,
    property_regime: propertyRegime,
    resource_nature: resourceNature,
    created_at: createdAtMicros
  };
}

/**
 * Returns the CellId of the Lobby cell if the conductor has one provisioned.
 * Returns null if the Lobby DNA is not installed or the client is unavailable.
 */
export async function getLobbyCellHandle(client: AppClient): Promise<CellId | null> {
  try {
    const appInfo = await client.appInfo();
    return getProvisionedCellId(appInfo, 'lobby');
  } catch {
    return null;
  }
}

function getProvisionedCellId(appInfo: AppInfo | null, roleName: string): CellId | null {
  if (!appInfo) return null;
  const cells = appInfo.cell_info?.[roleName] ?? [];
  for (const cellInfo of cells) {
    const info = cellInfo as Record<string, unknown>;
    if ('type' in info && info.type === 'provisioned' && 'value' in info) {
      const value = info.value as { cell_id: CellId };
      return value.cell_id;
    }
    if ('provisioned' in info && info.provisioned && typeof info.provisioned === 'object') {
      const provisioned = info.provisioned as { cell_id: CellId };
      return provisioned.cell_id;
    }
  }
  return null;
}

/**
 * Returns all group cloned cells installed for this agent.
 */
export function enumerateGroupCells(appInfo: AppInfo | null): GroupCellInfo[] {
  if (!appInfo) return [];
  return listGroupCells(appInfo);
}

/**
 * Returns the CellId of a Group cloned cell matching the given DNA hash.
 */
export async function getGroupCellHandle(
  client: AppClient,
  dnaHash: DnaHash
): Promise<CellId | null> {
  try {
    const appInfo = await client.appInfo();
    if (!appInfo) return null;
    const targetHashB64 = encodeHashToBase64(dnaHash);
    for (const cell of listGroupCells(appInfo)) {
      if (encodeHashToBase64(cell.dnaHash) === targetHashB64) {
        return cell.cellId;
      }
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Returns all NDO cloned cells installed for this agent.
 */
export function enumerateNdoCells(appInfo: AppInfo | null): GroupCellInfo[] {
  if (!appInfo) return [];
  return listNdoCells(appInfo);
}

/**
 * Returns the CellId of an NDO cloned cell matching the given DNA hash — the
 * NDO's permanent identity (ADR-010). Null when the agent has not engaged
 * (cloned) this NDO's network.
 */
export async function getNdoCellHandle(
  client: AppClient,
  dnaHash: DnaHash
): Promise<CellId | null> {
  try {
    const appInfo = await client.appInfo();
    if (!appInfo) return null;
    const targetHashB64 = encodeHashToBase64(dnaHash);
    for (const cell of listNdoCells(appInfo)) {
      if (encodeHashToBase64(cell.dnaHash) === targetHashB64) {
        return cell.cellId;
      }
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Returns the cloned group cell matching a network seed.
 */
export async function getGroupCellHandleBySeed(
  client: AppClient,
  networkSeed: string
): Promise<GroupCellInfo | null> {
  try {
    const appInfo = await client.appInfo();
    if (!appInfo) return null;
    return getGroupCellByNetworkSeed(appInfo, networkSeed);
  } catch {
    return null;
  }
}
