import type { ResourceNature, Rivalry } from '@nondominium/shared-types';

/**
 * Client-side nature→rivalry hint for UI (no DHT round-trip).
 * Mirrors `ResourceNature::default_rivalry`.
 */
export function defaultRivalryFor(nature: ResourceNature): Rivalry {
  switch (nature) {
    case 'Physical':
    case 'Hybrid':
      return 'Rivalrous';
    case 'Digital':
      return 'NonRivalrous';
  }
}

/** Effective rivalry for display: explicit override wins; else the nature default. */
export function effectiveRivalryLabel(
  nature: ResourceNature | null | undefined,
  rivalryOverride: string | null | undefined
): string | null {
  if (rivalryOverride === 'Rivalrous' || rivalryOverride === 'NonRivalrous') {
    return `${rivalryOverride} (override)`;
  }
  if (!nature) return null;
  const def = defaultRivalryFor(nature);
  return def ? `${def} (default)` : null;
}
