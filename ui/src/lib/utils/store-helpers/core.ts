import { Effect as E, pipe } from 'effect';

/**
 * Common store-helper primitives ported from Requests & Offers. These keep
 * Svelte 5 stores small by handling loading/error state, validation, and
 * client-connection fallbacks behind a tiny set of combinators.
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export interface LoadingStateSetter {
  setLoading: (value: boolean) => void;
  setError: (value: string | null) => void;
}

export type OperationWrapper = <T, E>(
  operation: () => E.Effect<T, E>
) => (setters: LoadingStateSetter) => E.Effect<T, E>;

export interface ErrorFactory<TError> {
  fromError: (error: unknown, context: string) => TError;
}

export type ErrorHandler<TError> = (error: unknown) => E.Effect<never, TError>;

export type ErrorContext = string;

// ─── Loading state management ───────────────────────────────────────────────

/**
 * Wrap an Effect-producing operation so that it automatically:
 *   - sets `loading = true` before running
 *   - sets `loading = false` afterwards (success or failure)
 *   - clears `error` on success, fills it on failure
 */
export const withLoadingState: OperationWrapper =
  <T, E>(operation: () => E.Effect<T, E>) =>
  (setters: LoadingStateSetter) =>
    pipe(
      E.sync(() => {
        setters.setLoading(true);
        setters.setError(null);
      }),
      E.flatMap(() => operation()),
      E.tap(() => E.sync(() => setters.setLoading(false))),
      E.tapError((error) =>
        E.sync(() => {
          setters.setLoading(false);
          const message = error instanceof Error ? error.message : String(error);
          setters.setError(message);
        })
      )
    );

/**
 * Build a setter object from `loading` / `error` setters of a Svelte store
 * that uses runes (`$state`) under the hood.
 */
export function createLoadingStateSetter(
  setLoading: (value: boolean) => void,
  setError: (value: string | null) => void
): LoadingStateSetter {
  return { setLoading, setError };
}

// ─── Error handling ─────────────────────────────────────────────────────────

/**
 * Convert any thrown value into a typed tagged error using an
 * `ErrorFactory.fromError(error, context)` static method.
 */
export function createErrorHandler<TError>(
  factory: ErrorFactory<TError>,
  context: ErrorContext
): ErrorHandler<TError> {
  return (error: unknown) => E.fail(factory.fromError(error, context));
}

/**
 * Generic error handler that wraps an unknown error using a callback.
 */
export function createGenericErrorHandler<TError>(
  toError: (error: unknown) => TError
): ErrorHandler<TError> {
  return (error: unknown) => E.fail(toError(error));
}

// ─── Cache invalidation ─────────────────────────────────────────────────────

/**
 * Build a function that invalidates a cache key when called. Useful as a
 * `tap` step after a mutation Effect succeeds.
 */
export function createCacheInvalidator<K>(
  invalidator: (key: K) => void
): (key: K) => E.Effect<void, never> {
  return (key) => E.sync(() => invalidator(key));
}

// ─── Client connection fallback ─────────────────────────────────────────────

/**
 * Wraps an Effect so that when it fails for "client not connected" reasons,
 * a fallback value is returned instead of an error. Useful for read-only
 * queries during initial app boot.
 */
export function withClientConnectionFallback<T, E>(
  effect: E.Effect<T, E>,
  fallback: T
): E.Effect<T, E> {
  return pipe(
    effect,
    E.catchAll((error) => {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes('not connected') || message.includes('WebSocket')) {
        return E.succeed(fallback);
      }
      return E.fail(error);
    })
  );
}

// ─── Safe operations ────────────────────────────────────────────────────────

/**
 * Build a safe operation that catches all errors from `effect` and converts
 * them to the supplied fallback value. Use sparingly — most Effects should
 * propagate errors.
 */
export function createSafeOperation<T, E>(
  effect: E.Effect<T, E>,
  fallback: T
): E.Effect<T, never> {
  return pipe(
    effect,
    E.catchAll(() => E.succeed(fallback))
  );
}

// ─── Validators ─────────────────────────────────────────────────────────────

/**
 * Build a validator that fails with the supplied error if any required field
 * on the input object is missing or empty.
 */
export function createRequiredFieldValidator<TInput extends Record<string, unknown>, TError>(
  requiredFields: ReadonlyArray<keyof TInput>,
  errorFactory: (field: string) => TError
): (input: TInput) => E.Effect<TInput, TError> {
  return (input: TInput) => {
    for (const field of requiredFields) {
      const value = input[field];
      if (value === undefined || value === null || value === '') {
        return E.fail(errorFactory(String(field)));
      }
    }
    return E.succeed(input);
  };
}

/**
 * Build a Holochain hash validator. Hashes must be `Uint8Array` of length
 * 39 (Holochain `HoloHash` = 3 prefix bytes + 32 hash + 4 DHT-location
 * bytes).
 */
export function createHashValidator<TError>(
  errorFactory: (reason: string) => TError
): (hash: unknown) => E.Effect<Uint8Array, TError> {
  return (hash: unknown) => {
    if (!(hash instanceof Uint8Array)) return E.fail(errorFactory('hash is not a Uint8Array'));
    if (hash.length !== 39) {
      return E.fail(errorFactory(`hash length is ${hash.length}, expected 39`));
    }
    return E.succeed(hash);
  };
}
