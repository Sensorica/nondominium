import type { NdoAnchorEntry } from '@nondominium/shared-types';

/**
 * Joins the `ndo` clone cell of every anchored NDO, one at a time. Every join
 * is a source-chain commit, and concurrent commits fail with "source chain head
 * has moved". One failing cell never stops the others.
 *
 * Inside Moss an asset only resolves to this tool on an agent whose conductor
 * holds the NDO's clone DNA, and NDO clones are not registered as public to the
 * Moss group yet (see `PUBLIC_NDO_CLONES`), so a member joins them from the
 * group's anchors instead.
 */
export async function ensureNdoCells(
  anchors: readonly NdoAnchorEntry[],
  ensure: (anchor: NdoAnchorEntry) => Promise<unknown>
): Promise<{ joined: number; failed: number }> {
  let joined = 0;
  let failed = 0;
  for (const anchor of anchors) {
    try {
      await ensure(anchor);
      joined += 1;
    } catch (error) {
      failed += 1;
      console.warn('[moss] could not join an NDO cell:', error);
    }
  }
  return { joined, failed };
}
