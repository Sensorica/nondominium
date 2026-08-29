import type { ResourceNature, Rivalry } from '@nondominium/shared-types';

/**
 * Client-side nature→rivalry hint for UI (no DHT round-trip).
 * Mirrors `ResourceNature::default_rivalry` for Physical/Hybrid/Digital/Information.
 * `Service` is ambiguous — returns `null` so the UI can prompt for an override.
 */
export function defaultRivalryFor(nature: ResourceNature): Rivalry | null {
  switch (nature) {
    case 'Physical':
    case 'Hybrid':
      return 'Rivalrous';
    case 'Digital':
    case 'Information':
      return 'NonRivalrous';
    case 'Service':
      return null;
  }
}

/** Effective rivalry for display: explicit override wins; else nature default (or null for Service). */
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
