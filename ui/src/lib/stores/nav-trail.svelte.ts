/**
 * Session return-trail for Group Agent Perspective jumps
 * (mirrors design-system resource-perspective `pushTrail` / `popTrail`).
 */
export type NavTrailEntry = { label: string; href: string };

let trail = $state<NavTrailEntry[]>([]);

export const navTrail = {
  get entries(): NavTrailEntry[] {
    return trail;
  },
  get top(): NavTrailEntry | null {
    return trail.length > 0 ? trail[trail.length - 1]! : null;
  },
  push(entry: NavTrailEntry): void {
    trail = [...trail, entry];
  },
  pop(): NavTrailEntry | null {
    if (trail.length === 0) return null;
    const top = trail[trail.length - 1]!;
    trail = trail.slice(0, -1);
    return top;
  },
  clear(): void {
    trail = [];
  }
};
