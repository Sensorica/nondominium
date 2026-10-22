import { describe, it, expect } from 'vitest';
import {
  SEEDED_AT,
  dataOf,
  errorOf,
  idle,
  isBusy,
  reduce,
  type EntityEvent,
  type EntityState
} from './entity-state';

type S = EntityState<string, string>;
type Ev = EntityEvent<string, string>;

const started: Ev = { _tag: 'FetchStarted' };
const ok = (data: string, at = 1): Ev => ({ _tag: 'FetchSucceeded', data, at });
const failed = (error: string): Ev => ({ _tag: 'FetchFailed', error });
const seeded = (data: string): Ev => ({ _tag: 'Seeded', data });

const run = (events: Ev[], from: S = idle()): S => events.reduce(reduce, from);

describe('entity-state reduce', () => {
  it('first load: Idle, Loading, Success', () => {
    const loading = run([started]);
    expect(loading._tag).toBe('Loading');
    expect(isBusy(loading)).toBe(true);
    expect(run([started, ok('a', 7)])).toEqual({ _tag: 'Success', data: 'a', fetchedAt: 7 });
  });

  it('first-load failure is Failure, with no data', () => {
    const s = run([started, failed('boom')]);
    expect(s).toEqual({ _tag: 'Failure', error: 'boom' });
    expect(dataOf(s)).toBeNull();
    expect(errorOf(s)).toBe('boom');
  });

  it('refresh with data held is Refreshing and keeps the data', () => {
    const s = run([started, ok('a'), started]);
    expect(s).toEqual({ _tag: 'Refreshing', data: 'a' });
    expect(isBusy(s)).toBe(true);
  });

  it('refresh failure keeps the data as Stale and records the error', () => {
    const s = run([started, ok('a'), started, failed('offline')]);
    expect(s).toEqual({ _tag: 'Stale', data: 'a', error: 'offline' });
    expect(dataOf(s)).toBe('a');
    expect(errorOf(s)).toBe('offline');
    expect(isBusy(s)).toBe(false);
  });

  it('a retry from Stale is Refreshing, and success clears the error', () => {
    const stale = run([started, ok('a'), started, failed('x')]);
    expect(reduce(stale, started)).toEqual({ _tag: 'Refreshing', data: 'a' });
    const s = run([started, ok('b', 9)], stale);
    expect(s).toEqual({ _tag: 'Success', data: 'b', fetchedAt: 9 });
    expect(errorOf(s)).toBeNull();
  });

  it('a retry from Failure is Loading', () => {
    expect(run([started, failed('x'), started])._tag).toBe('Loading');
  });

  it('Seeded from Idle is Success marked as never fetched', () => {
    expect(run([seeded('cached')])).toEqual({ _tag: 'Success', data: 'cached', fetchedAt: SEEDED_AT });
  });

  it('Seeded during a first load is Refreshing, so the state stays busy', () => {
    const s = run([started, seeded('cached')]);
    expect(s).toEqual({ _tag: 'Refreshing', data: 'cached' });
    expect(run([failed('x')], s)).toEqual({ _tag: 'Stale', data: 'cached', error: 'x' });
  });

  it('Seeded after a first-load failure is Stale, keeping the error', () => {
    expect(run([started, failed('x'), seeded('cached')])).toEqual({
      _tag: 'Stale',
      data: 'cached',
      error: 'x'
    });
  });

  it('Seeded never overwrites data already held', () => {
    const success = run([started, ok('fresh', 5)]);
    expect(reduce(success, seeded('old'))).toBe(success);
    const refreshing = run([started], success);
    expect(reduce(refreshing, seeded('old'))).toBe(refreshing);
    const stale = run([failed('x')], refreshing);
    expect(reduce(stale, seeded('old'))).toBe(stale);
  });

  it('idle helpers', () => {
    const s = idle<string, string>();
    expect(dataOf(s)).toBeNull();
    expect(errorOf(s)).toBeNull();
    expect(isBusy(s)).toBe(false);
  });
});

describe('entity-state generated sequences', () => {
  // Deterministic LCG so a failing sequence reproduces from its seed.
  const rng = (seed: number) => () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 2 ** 32;
  };

  const randomEvent = (next: () => number, i: number): Ev => {
    const r = next();
    if (r < 0.3) return started;
    if (r < 0.55) return ok(`d${i}`, i + 1);
    if (r < 0.85) return failed(`e${i}`);
    return seeded(`c${i}`);
  };

  it('once data is held it is never lost, and only Stale carries data and an error', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const next = rng(seed);
      let state: S = idle();
      let held = false;
      for (let i = 0; i < 40; i++) {
        state = reduce(state, randomEvent(next, i));
        const data = dataOf(state);
        const error = errorOf(state);
        if (held) {
          expect(state._tag, `seed ${seed} step ${i}`).not.toBe('Failure');
          expect(data, `seed ${seed} step ${i}`).not.toBeNull();
        }
        if (data !== null && error !== null) expect(state._tag).toBe('Stale');
        held = held || data !== null;
      }
    }
  });
});
