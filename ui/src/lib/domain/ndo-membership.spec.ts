import { describe, expect, it } from 'vitest';
import { ndosJoinedBy } from './ndo-membership';

const ndo = (hash: string) => ({ hash, name: hash });

describe('ndosJoinedBy', () => {
  const ndos = [ndo('created-only'), ndo('joined'), ndo('both')];

  it('returns only the NDOs whose hashes are in the membership set', () => {
    expect(ndosJoinedBy(ndos, ['joined', 'both']).map((d) => d.hash)).toEqual(['joined', 'both']);
  });

  it('returns nothing when the agent has not joined any of the visible NDOs', () => {
    expect(ndosJoinedBy(ndos, [])).toEqual([]);
  });

  it('ignores membership hashes that are not in the visible NDO list', () => {
    expect(ndosJoinedBy(ndos, ['somewhere-else']).map((d) => d.hash)).toEqual([]);
  });
});
