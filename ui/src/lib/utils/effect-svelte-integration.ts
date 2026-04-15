import { Effect as E, Cause, Exit, pipe } from 'effect';
import { onMount, onDestroy } from 'svelte';

/**
 * Effect-TS / Svelte 5 integration utilities.
 *
 * Ported from the Requests & Offers reference codebase. Provides idiomatic
 * Svelte lifecycle helpers for running Effects, with structured error
 * handling, scoped resource management, and debounced execution.
 */

// ─── Lifecycle helpers ──────────────────────────────────────────────────────

/**
 * Run an Effect on component mount. Errors are logged via the supplied
 * handler. The Effect is fire-and-forget at the call site.
 */
export function useEffectOnMount<A, E>(
  effect: E.Effect<A, E>,
  onError?: (error: E) => void
): void {
  onMount(() => {
    void E.runPromiseExit(effect).then((exit) => {
      if (Exit.isFailure(exit)) {
        const failure = Cause.failureOption(exit.cause);
        if (failure._tag === 'Some' && onError) onError(failure.value);
        else if (failure._tag === 'Some') console.error('useEffectOnMount failure:', exit.cause);
        else console.error('useEffectOnMount defect/interrupt:', exit.cause);
      }
    });
  });
}

/**
 * Run an Effect on mount AND register a cleanup callback returned by the
 * Effect's success value. The cleanup runs on component destroy.
 */
export function useEffectWithCallback<A extends () => void, E>(
  effect: E.Effect<A, E>,
  onError?: (error: E) => void
): void {
  let cleanup: A | undefined;

  onMount(() => {
    void E.runPromiseExit(effect).then((exit) => {
      if (Exit.isSuccess(exit)) cleanup = exit.value;
      else {
        const failure = Cause.failureOption(exit.cause);
        if (failure._tag === 'Some' && onError) onError(failure.value);
        else if (failure._tag === 'Some') console.error('useEffectWithCallback failure:', exit.cause);
        else console.error('useEffectWithCallback defect/interrupt:', exit.cause);
      }
    });
  });

  onDestroy(() => {
    if (cleanup) cleanup();
  });
}

// ─── Store initialization ───────────────────────────────────────────────────

/**
 * Returns an initializer function that runs the supplied Effect-producing
 * thunk and reports errors via the boundary. Stores call this in their
 * `initialize()` method.
 */
export function createStoreInitializer<A, E>(
  effectThunk: () => E.Effect<A, E>,
  errorBoundary?: (error: E) => void
): () => Promise<void> {
  return async () => {
    const exit = await E.runPromiseExit(effectThunk());
    if (Exit.isFailure(exit)) {
      const failure = Cause.failureOption(exit.cause);
      if (failure._tag === 'Some' && errorBoundary) errorBoundary(failure.value);
      else console.error('Store initialization failed:', exit.cause);
    }
  };
}

/**
 * Variant for stores that need re-initialization on dependency changes (e.g.
 * Svelte reactive `$effect` inside a `.svelte.ts` rune file).
 */
export function createReactiveStoreInitializer<A, E>(
  effectThunk: () => E.Effect<A, E>,
  errorBoundary?: (error: E) => void
): () => void {
  return () => {
    void E.runPromiseExit(effectThunk()).then((exit) => {
      if (Exit.isFailure(exit)) {
        const failure = Cause.failureOption(exit.cause);
        if (failure._tag === 'Some' && errorBoundary) errorBoundary(failure.value);
        else console.error('Reactive store initialization failed:', exit.cause);
      }
    });
  };
}

// ─── Error boundaries ───────────────────────────────────────────────────────

/**
 * Build an error boundary that funnels Effect failures through `setError`
 * (or just logs if no setter is supplied). Returns the original Effect
 * unchanged so it can be composed in a pipe.
 */
export function createEffectErrorBoundary<A, E>(
  setError?: (message: string | null) => void
): (effect: E.Effect<A, E>) => E.Effect<A, E> {
  return (effect) =>
    pipe(
      effect,
      E.tapError((error) =>
        E.sync(() => {
          const message = error instanceof Error ? error.message : String(error);
          if (setError) setError(message);
          else console.error('Effect error boundary:', error);
        })
      )
    );
}

/**
 * Generic error boundary that maps any tagged error to a user-facing string
 * via `formatter`.
 */
export function createGenericErrorBoundary<E>(
  formatter: (error: E) => string,
  setError?: (message: string | null) => void
): <A>(effect: E.Effect<A, E>) => E.Effect<A, E> {
  return <A>(effect: E.Effect<A, E>) =>
    pipe(
      effect,
      E.tapError((error) =>
        E.sync(() => {
          const message = formatter(error);
          if (setError) setError(message);
          else console.error('Generic error boundary:', message);
        })
      )
    );
}

// ─── Resource management ────────────────────────────────────────────────────

/**
 * Use an Effect-produced resource for the lifetime of the component. The
 * `release` Effect runs on destroy. Returns the value via a callback once
 * acquisition completes.
 */
export function useEffectResource<R, E>(
  acquire: E.Effect<R, E>,
  release: (resource: R) => E.Effect<void, never>,
  onAcquire: (resource: R) => void,
  onError?: (error: E) => void
): void {
  let resource: R | undefined;

  onMount(() => {
    void E.runPromiseExit(acquire).then((exit) => {
      if (Exit.isSuccess(exit)) {
        resource = exit.value;
        onAcquire(resource);
      } else {
        const failure = Cause.failureOption(exit.cause);
        if (failure._tag === 'Some' && onError) onError(failure.value);
      }
    });
  });

  onDestroy(() => {
    if (resource !== undefined) void E.runPromise(release(resource));
  });
}

/**
 * Build a scoped resource manager that tracks N acquired resources and
 * releases all of them when `releaseAll` is called.
 */
export function createScopedResourceManager<R>(): {
  acquire: <E>(
    effect: E.Effect<R, E>,
    release: (resource: R) => E.Effect<void, never>
  ) => Promise<R | undefined>;
  releaseAll: () => Promise<void>;
} {
  const acquired: Array<{ resource: R; release: (r: R) => E.Effect<void, never> }> = [];

  return {
    acquire: async (effect, release) => {
      const exit = await E.runPromiseExit(effect);
      if (Exit.isSuccess(exit)) {
        acquired.push({ resource: exit.value, release });
        return exit.value;
      }
      console.error('Scoped resource acquire failed:', exit.cause);
      return undefined;
    },
    releaseAll: async () => {
      while (acquired.length > 0) {
        const item = acquired.pop();
        if (item) await E.runPromise(item.release(item.resource));
      }
    }
  };
}

// ─── Effect runners ─────────────────────────────────────────────────────────

/**
 * Run an Effect from inside Svelte component code. Returns a promise that
 * resolves to the success value or rejects with the typed error.
 */
export function runEffect<A, E>(effect: E.Effect<A, E>): Promise<A> {
  return E.runPromise(effect);
}

/**
 * Build a debounced runner for an Effect-producing function. Subsequent
 * calls within `delayMs` cancel the prior pending invocation.
 */
export function createDebouncedEffectRunner<Args extends unknown[], A, E>(
  effectThunk: (...args: Args) => E.Effect<A, E>,
  delayMs: number
): (...args: Args) => void {
  let timer: ReturnType<typeof setTimeout> | undefined;

  return (...args: Args) => {
    if (timer !== undefined) clearTimeout(timer);
    timer = setTimeout(() => {
      void E.runPromiseExit(effectThunk(...args)).then((exit) => {
        if (Exit.isFailure(exit)) console.error('Debounced Effect failed:', exit.cause);
      });
    }, delayMs);
  };
}
