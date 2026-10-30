/** Truncate an agent pubkey (or any b64 hash) for dense list display. */
export function truncatePubkey(b64: string, head = 12, tail = 4): string {
  const s = b64.trim();
  if (s.length <= head + tail + 1) return s;
  return `${s.slice(0, head)}…${s.slice(-tail)}`;
}

/** Copy full pubkey to clipboard. Returns true on success. */
export async function copyPubkey(b64: string): Promise<boolean> {
  const text = b64.trim();
  if (!text) return false;
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export interface AgentMemberOption {
  /** Full AgentPubKey as base64. */
  id: string;
  /** Display nickname / Person name. */
  name: string;
  role?: string;
}

/** Deduplicate by id; first name wins. */
export function mergeAgentOptions(...lists: AgentMemberOption[][]): AgentMemberOption[] {
  const map = new Map<string, AgentMemberOption>();
  for (const list of lists) {
    for (const m of list) {
      if (!m.id || map.has(m.id)) continue;
      map.set(m.id, m);
    }
  }
  return Array.from(map.values());
}
