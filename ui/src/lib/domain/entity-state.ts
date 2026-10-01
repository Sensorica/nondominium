/**
 * Six-state lifecycle of a remotely fetched entity (R&O frontend refactoring proposal 4a).
 *
 * Pure: no svelte, no effect, no services, no stores. A store holds one `EntityState` per
 * slice and feeds it events; components read it through `dataOf`, `errorOf` and `isBusy`.
 *
 * `Stale` is the one deliberate state carrying both data and an error: a background refresh
 * failed, so the last good data stays on screen and the error is recorded beside it. Every
 * other state carries data or an error, never both, and once data is held no event drops it.
 *
 * This departs from 4a on purpose: there `Stale` means data past cache expiry, with
 * `expiredAt` and no error, and no state may hold data and an error together. Here `Stale`
 * has no expiry and relaxes that property for itself alone (see `ui_architecture.md`).
 */

export type EntityState<A, E> =
  | { readonly _tag: 'Idle' }
  | { readonly _tag: 'Loading' }
  | { readonly _tag: 'Refreshing'; readonly data: A }
  | { readonly _tag: 'Stale'; readonly data: A; readonly error: E }
  | { readonly _tag: 'Failure'; readonly error: E }
  | { readonly _tag: 'Success'; readonly data: A; readonly fetchedAt: number };

export type EntityEvent<A, E> =
  | { readonly _tag: 'FetchStarted' }
  | { readonly _tag: 'FetchSucceeded'; readonly data: A; readonly at: number }
  | { readonly _tag: 'FetchFailed'; readonly error: E }
  | { readonly _tag: 'Seeded'; readonly data: A }; // cache hit before the first fetch

/** `fetchedAt` of a `Success` built from a cache seed: the data was never fetched by this state. */
export const SEEDED_AT = 0;

export const idle = <A, E>(): EntityState<A, E> => ({ _tag: 'Idle' });

/**
 * Transition rules:
 * - FetchStarted: Refreshing when data is held, otherwise Loading.
 * - FetchSucceeded: always Success.
 * - FetchFailed: Stale when data is held (data kept, error recorded), otherwise Failure.
 * - Seeded: a cache value never overwrites data the state already holds, since that data
 *   is at least as new as the cache. From Idle it gives Success with `fetchedAt: SEEDED_AT`.
 *   From Loading it gives Refreshing, because a fetch is still in flight and the state must
 *   stay busy. From Failure it gives Stale, so the error stays visible next to the cached data.
 */
export function reduce<A, E>(state: EntityState<A, E>, event: EntityEvent<A, E>): EntityState<A, E> {
  switch (event._tag) {
    case 'FetchStarted': {
      const data = dataOf(state);
      return data === null ? { _tag: 'Loading' } : { _tag: 'Refreshing', data };
    }
    case 'FetchSucceeded':
      return { _tag: 'Success', data: event.data, fetchedAt: event.at };
    case 'FetchFailed': {
      const data = dataOf(state);
      return data === null
        ? { _tag: 'Failure', error: event.error }
        : { _tag: 'Stale', data, error: event.error };
    }
    case 'Seeded':
      switch (state._tag) {
        case 'Idle':
          return { _tag: 'Success', data: event.data, fetchedAt: SEEDED_AT };
        case 'Loading':
          return { _tag: 'Refreshing', data: event.data };
        case 'Failure':
          return { _tag: 'Stale', data: event.data, error: state.error };
        default:
          return state;
      }
  }
}

export function dataOf<A, E>(state: EntityState<A, E>): A | null {
  switch (state._tag) {
    case 'Refreshing':
    case 'Stale':
    case 'Success':
      return state.data;
    default:
      return null;
  }
}

export function errorOf<A, E>(state: EntityState<A, E>): E | null {
  switch (state._tag) {
    case 'Stale':
    case 'Failure':
      return state.error;
    default:
      return null;
  }
}

export function isBusy<A, E>(state: EntityState<A, E>): boolean {
  return state._tag === 'Loading' || state._tag === 'Refreshing';
}
