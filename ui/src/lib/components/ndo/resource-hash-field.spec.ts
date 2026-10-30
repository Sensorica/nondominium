import { describe, expect, it } from 'vitest';
import {
  NO_ECONOMIC_RESOURCE_MESSAGE,
  resourceHashPrompt
} from './resource-hash-field';

describe('resourceHashPrompt', () => {
  it('stays quiet while inventoried resources are still loading', () => {
    expect(
      resourceHashPrompt({ loaded: false, lookupFailed: false, instanceCount: 0, filledFromCommitment: false })
    ).toEqual({ kind: 'loading' });
  });

  it('asks for a pasted hash only when an economic resource exists', () => {
    expect(
      resourceHashPrompt({ loaded: true, lookupFailed: false, instanceCount: 2, filledFromCommitment: false })
    ).toEqual({ kind: 'entry' });
  });

  it('says the NDO has no economic resource instead of asking for a hash', () => {
    expect(
      resourceHashPrompt({ loaded: true, lookupFailed: false, instanceCount: 0, filledFromCommitment: false })
    ).toEqual({ kind: 'missing', message: NO_ECONOMIC_RESOURCE_MESSAGE });
    expect(NO_ECONOMIC_RESOURCE_MESSAGE).toMatch(/no economic resource/i);
    expect(NO_ECONOMIC_RESOURCE_MESSAGE).not.toMatch(/paste|b64|base64/i);
  });

  it('keeps the hash field when a commitment already names a resource', () => {
    expect(
      resourceHashPrompt({ loaded: true, lookupFailed: false, instanceCount: 0, filledFromCommitment: true })
    ).toEqual({ kind: 'entry' });
  });

  it('keeps the hash field when the lookup itself failed', () => {
    expect(
      resourceHashPrompt({ loaded: true, lookupFailed: true, instanceCount: 0, filledFromCommitment: false })
    ).toEqual({ kind: 'entry' });
  });
});
