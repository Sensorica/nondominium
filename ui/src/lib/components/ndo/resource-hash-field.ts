/** Shown in place of the resource-hash input when this NDO has no EconomicResource. */
export const NO_ECONOMIC_RESOURCE_MESSAGE =
  'This NDO has no economic resource yet. An event can be logged once a resource instance exists.';

/** Digital NDOs are not inventoriable — events that need shelf units do not apply the same way. */
export const DIGITAL_NO_INVENTORY_MESSAGE =
  'This NDO is digital — unique by content or address, not inventoriable stock. Prefer Cite or Work commitments on the NDO itself; shelf-unit economic events need a Physical/Hybrid inventoriable resource.';

export type ResourceHashPrompt =
  | { kind: 'loading' }
  | { kind: 'entry' }
  | { kind: 'locked' }
  | { kind: 'digital'; message: string }
  | { kind: 'missing'; message: string };

/**
 * The log-event form asks for an EconomicResource action hash only when one
 * exists. An empty inventory is a message, not a paste box.
 * Use/Consume dual-created NDOs lock to the single seeded resource.
 * Digital NDOs never inventoriable — show digital guidance instead.
 */
export function resourceHashPrompt(input: {
  loaded: boolean;
  lookupFailed: boolean;
  instanceCount: number;
  filledFromCommitment: boolean;
  /** When true, lock to the dual-created inventoriable resource. */
  inventoriableFork?: boolean;
  /** Digital nature — never inventoriable. */
  digital?: boolean;
}): ResourceHashPrompt {
  if (!input.loaded) return { kind: 'loading' };
  if (input.digital) {
    return { kind: 'digital', message: DIGITAL_NO_INVENTORY_MESSAGE };
  }
  if (input.lookupFailed) return { kind: 'entry' };
  if (input.inventoriableFork && input.instanceCount === 1) return { kind: 'locked' };
  if (input.filledFromCommitment || input.instanceCount > 0) {
    return { kind: 'entry' };
  }
  return { kind: 'missing', message: NO_ECONOMIC_RESOURCE_MESSAGE };
}
