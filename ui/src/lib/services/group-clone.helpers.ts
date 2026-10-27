import type { AppInfo, CellId, ClonedCell, DnaHash, CellInfo } from '@holochain/client';
import { CellType, encodeHashToBase64 } from '@holochain/client';
import { decode } from '@msgpack/msgpack';
import type { NdoAnchorEntry } from '@nondominium/shared-types';

export interface GroupCellInfo {
  networkSeed: string;
  dnaHash: DnaHash;
  cellId: CellId;
  cloneId: string;
  enabled: boolean;
}

/** Decoded app-entry fields used from group zome records. */
export interface DecodedGroupEntry {
  name?: string;
  description?: string;
  group_hash?: Uint8Array;
  target_ndo_hash?: Uint8Array;
}

/** Minimal Holochain Record shape returned by group zome calls. */
export interface GroupHolochainRecord {
  signed_action: {
    hashed: {
      hash: Uint8Array;
      content: {
        author: Uint8Array;
        timestamp: number;
      };
    };
  };
  entry?: {
    // `Present.entry` is the msgpack-encoded app entry (Uint8Array) as returned
    // by the conductor. It must be decoded before its fields can be read.
    Present?: {
      entry: Uint8Array;
    };
  };
}

/**
 * Decodes the app entry of a group zome Record. The conductor returns the entry
 * as msgpack bytes; reading fields without decoding yields `undefined`.
 */
export function decodeGroupEntry(record: GroupHolochainRecord): DecodedGroupEntry | null {
  const raw = record.entry?.Present?.entry as unknown;
  if (raw == null) return null;
  if (raw instanceof Uint8Array) {
    try {
      return decode(raw) as DecodedGroupEntry;
    } catch {
      return null;
    }
  }
  // Defensive: some call sites may already hand us a decoded object.
  return raw as DecodedGroupEntry;
}

/**
 * Decodes a zome_group NdoAnchor Record into its entry fields. Returns null if
 * the record has no present entry or is missing the clone-coordinate fields
 * (ndo_dna_hash / identity_action_hash / network_seed) — malformed anchors are
 * skipped silently, matching the eventual-consistency tolerance of the read path.
 */
export function decodeNdoAnchorRecord(record: GroupHolochainRecord): NdoAnchorEntry | null {
  const raw = record.entry?.Present?.entry as unknown;
  if (raw == null) return null;
  let obj: unknown;
  if (raw instanceof Uint8Array) {
    try {
      obj = decode(raw);
    } catch {
      return null;
    }
  } else {
    obj = raw;
  }
  const anchor = obj as Partial<NdoAnchorEntry> | null;
  if (!anchor?.ndo_dna_hash || !anchor.identity_action_hash || !anchor.network_seed) return null;
  return anchor as NdoAnchorEntry;
}

export function generateNetworkSeed(): string {
  return `grp_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function parseClonedCellInfo(cellInfo: CellInfo | Record<string, unknown>): GroupCellInfo | null {
  // Holochain client may serialize as { type, value } or { cloned: value }
  if ('type' in cellInfo && cellInfo.type === CellType.Cloned && 'value' in cellInfo) {
    const cloned = cellInfo.value as ClonedCell;
    return cellInfoFromCloned(cloned);
  }
  if ('cloned' in cellInfo && cellInfo.cloned && typeof cellInfo.cloned === 'object') {
    return cellInfoFromCloned(cellInfo.cloned as ClonedCell);
  }
  return null;
}

function cellInfoFromCloned(cloned: ClonedCell): GroupCellInfo | null {
  const [dnaHash] = cloned.cell_id;
  const networkSeed = cloned.dna_modifiers?.network_seed;
  if (!networkSeed || typeof networkSeed !== 'string') return null;
  return {
    networkSeed,
    dnaHash,
    cellId: cloned.cell_id,
    cloneId: cloned.clone_id ?? cloned.name ?? networkSeed,
    enabled: 'enabled' in cloned ? Boolean(cloned.enabled) : true
  };
}

export function listGroupCells(appInfo: AppInfo | null): GroupCellInfo[] {
  if (!appInfo) return [];
  const groupCells = appInfo.cell_info?.['group'] ?? [];
  const results: GroupCellInfo[] = [];
  for (const cellInfo of groupCells) {
    const parsed = parseClonedCellInfo(cellInfo as CellInfo);
    if (parsed) results.push(parsed);
  }
  return results;
}

export function getGroupCellByNetworkSeed(
  appInfo: AppInfo | null,
  networkSeed: string
): GroupCellInfo | null {
  return listGroupCells(appInfo).find((c) => c.networkSeed === networkSeed) ?? null;
}

export function groupProfileFromRecord(record: GroupHolochainRecord): {
  groupHashB64: string;
  name: string;
  description?: string;
} | null {
  const hashBytes = record.signed_action?.hashed?.hash;
  if (!hashBytes) return null;
  const entry = decodeGroupEntry(record);
  return {
    groupHashB64: encodeHashToBase64(hashBytes),
    name: entry?.name ?? 'Group',
    description: entry?.description
  };
}

export function softLinkTargetHashB64(record: GroupHolochainRecord): string | null {
  const target = decodeGroupEntry(record)?.target_ndo_hash;
  if (!target) return null;
  return encodeHashToBase64(target);
}
