import type { AppInfo, CellId, CellInfo, ClonedCell, DnaHash } from '@holochain/client';
import { CellType, encodeHashToBase64 } from '@holochain/client';

/**
 * Resolved handle for a cloned `ndo` cell (ADR-010: one clone per NDO).
 * Parallel to `GroupCellInfo` but keyed by DnaHash — the NDO's permanent
 * identity, bound to the Layer 0 fields via DNA properties.
 */
export interface NdoCellInfo {
  networkSeed: string;
  dnaHash: DnaHash;
  cellId: CellId;
  cloneId: string;
  enabled: boolean;
}

function cellInfoFromCloned(cloned: ClonedCell): NdoCellInfo | null {
  const [dnaHash] = cloned.cell_id;
  const networkSeed = cloned.dna_modifiers?.network_seed;
  // An ndo clone always carries a unique network_seed (see generateNdoNetworkSeed),
  // so a missing/non-string seed means the cell_info shape is not what we expect.
  if (!networkSeed || typeof networkSeed !== 'string') return null;
  return {
    networkSeed,
    dnaHash,
    cellId: cloned.cell_id,
    cloneId: cloned.clone_id ?? cloned.name ?? networkSeed,
    enabled: 'enabled' in cloned ? Boolean(cloned.enabled) : true
  };
}

function parseClonedCellInfo(cellInfo: CellInfo | Record<string, unknown>): NdoCellInfo | null {
  // Holochain client may serialize as { type, value } or { cloned: value }.
  if ('type' in cellInfo && cellInfo.type === CellType.Cloned && 'value' in cellInfo) {
    return cellInfoFromCloned(cellInfo.value as ClonedCell);
  }
  if ('cloned' in cellInfo && cellInfo.cloned && typeof cellInfo.cloned === 'object') {
    return cellInfoFromCloned(cellInfo.cloned as ClonedCell);
  }
  return null;
}

/** All `ndo` cloned cells installed for this agent. */
export function listNdoCells(appInfo: AppInfo | null): NdoCellInfo[] {
  if (!appInfo) return [];
  const ndoCells = appInfo.cell_info?.['ndo'] ?? [];
  const results: NdoCellInfo[] = [];
  for (const cellInfo of ndoCells) {
    const parsed = parseClonedCellInfo(cellInfo as CellInfo);
    if (parsed) results.push(parsed);
  }
  return results;
}

/** The `ndo` clone matching a DnaHash (the NDO's permanent identity). */
export function getNdoCellByDnaHash(appInfo: AppInfo | null, dnaHash: DnaHash): NdoCellInfo | null {
  const target = encodeHashToBase64(dnaHash);
  return listNdoCells(appInfo).find((c) => encodeHashToBase64(c.dnaHash) === target) ?? null;
}

/**
 * Unique network_seed for a new NDO clone. The DnaHash is derived from
 * (network_seed, properties), so two NDOs with identical classification fields
 * still get distinct cells/networks. Stored on the NdoAnchor so peers re-derive
 * the exact same clone.
 */
export function generateNdoNetworkSeed(): string {
  return `ndo_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}
