import { encodeHashToBase64, type ActionHash, type DnaHash } from '@holochain/client';
import type { AssetInfo, WAL } from '@theweave/api';
import type { NdoAnchorEntry } from '@nondominium/shared-types';

/**
 * Icon Moss shows next to an NDO asset, inline so asset info never depends on
 * a request. A square with the letter N.
 */
export const NDO_ICON_SRC =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="6" fill="#2563eb"/><text x="16" y="23" font-family="sans-serif" font-size="20" font-weight="700" text-anchor="middle" fill="#fff">N</text></svg>'
  );

type NdoCoordinates = Pick<NdoAnchorEntry, 'ndo_dna_hash' | 'identity_action_hash'>;

/**
 * The Weave Asset Locator of an NDO: the NDO's own clone DNA, which is its
 * permanent identity (ADR-010), and its `NondominiumIdentity` record inside it.
 */
export function ndoWal(ndo: NdoCoordinates): WAL {
  return { hrl: [ndo.ndo_dna_hash, ndo.identity_action_hash] };
}

export function walToNdo(wal: WAL): { dnaHash: DnaHash; identityActionHash: ActionHash } {
  return { dnaHash: wal.hrl[0], identityActionHash: wal.hrl[1] };
}

/** The route of the NDO detail view, keyed by the identity action hash. */
export function ndoPath(wal: WAL): string {
  return `/ndo/${encodeHashToBase64(wal.hrl[1])}`;
}

/** The anchor an asset points at: both hashes must match. */
export function findAnchorForWal(anchors: readonly NdoAnchorEntry[], wal: WAL): NdoAnchorEntry | undefined {
  const dna = encodeHashToBase64(wal.hrl[0]);
  const identity = encodeHashToBase64(wal.hrl[1]);
  return anchors.find(
    (anchor) =>
      encodeHashToBase64(anchor.ndo_dna_hash) === dna &&
      encodeHashToBase64(anchor.identity_action_hash) === identity
  );
}

/** `getAssetInfo`: the name and icon of an NDO of this group, or undefined. */
export function ndoAssetInfo(anchors: readonly NdoAnchorEntry[], wal: WAL): AssetInfo | undefined {
  const anchor = findAnchorForWal(anchors, wal);
  return anchor ? { name: anchor.name, icon_src: NDO_ICON_SRC } : undefined;
}

/** `search`: the NDOs of this group whose name contains the filter, ignoring case. */
export function searchNdoAssets(anchors: readonly NdoAnchorEntry[], filter: string): WAL[] {
  const needle = filter.trim().toLowerCase();
  return anchors.filter((anchor) => anchor.name.toLowerCase().includes(needle)).map(ndoWal);
}
