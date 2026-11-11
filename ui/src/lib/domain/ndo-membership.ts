/**
 * Visible NDOs this agent has actually joined.
 *
 * Initiation is a different fact (the descriptor's `initiator`). A hash is a
 * membership only when `join_ndo` recorded it; creation does not.
 */
export function ndosJoinedBy<T extends { hash: string }>(
  ndos: readonly T[],
  joinedHashes: readonly string[]
): T[] {
  const joined = new Set(joinedHashes);
  return ndos.filter((ndo) => joined.has(ndo.hash));
}
