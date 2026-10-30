/** Shown in place of the resource-hash input when this NDO has no EconomicResource. */
export const NO_ECONOMIC_RESOURCE_MESSAGE =
  'This NDO has no economic resource yet. An event can be logged once a resource instance exists.';

export type ResourceHashPrompt =
  | { kind: 'loading' }
  | { kind: 'entry' }
  | { kind: 'missing'; message: string };

/**
 * The log-event form asks for an EconomicResource action hash only when one
 * exists. An empty inventory is a message, not a paste box.
 */
export function resourceHashPrompt(input: {
  loaded: boolean;
  lookupFailed: boolean;
  instanceCount: number;
  filledFromCommitment: boolean;
}): ResourceHashPrompt {
  if (!input.loaded) return { kind: 'loading' };
  if (input.lookupFailed || input.filledFromCommitment || input.instanceCount > 0) {
    return { kind: 'entry' };
  }
  return { kind: 'missing', message: NO_ECONOMIC_RESOURCE_MESSAGE };
}
