import { Effect as E } from 'effect';
import type { HolochainClientService, ZomeName } from '$lib/services/holochain.service.svelte';

/**
 * Wait until the Holochain client is connected.
 *
 * The current `HolochainClientService` does not expose `waitForConnection`,
 * so this helper polls `isConnected` until it becomes true (or attempts to
 * connect once if never initialized).
 *
 * TODO (next PR): replace with a first-class `waitForConnection()` on the
 * service that resolves a deferred when the connection is established.
 */
async function ensureConnected(holochainClient: HolochainClientService): Promise<void> {
  if (holochainClient.isConnected && holochainClient.client !== null) return;
  await holochainClient.connectClient();
}

/**
 * Wraps a Holochain zome call in an Effect, mapping any thrown exception to
 * a tagged error constructed by `ErrorConstructor(message, context)`.
 */
export const wrapZomeCall = <T, E>(
  holochainClient: HolochainClientService,
  zomeName: string,
  fnName: string,
  payload: unknown,
  errorContext: string,
  ErrorConstructor: new (message: string, context?: string) => E
): E.Effect<T, E> =>
  E.tryPromise({
    try: async () => {
      await ensureConnected(holochainClient);
      const result = await holochainClient.callZome(zomeName as ZomeName, fnName, payload);
      return result as T;
    },
    catch: (error) =>
      new ErrorConstructor(
        error instanceof Error ? error.message : String(error),
        errorContext
      ) as E
  });

/**
 * Variant of `wrapZomeCall` that accepts a static factory (e.g.
 * `PersonError.fromError`) instead of a constructor — useful when the error
 * type's constructor signature does not match `(message, context?)`.
 */
export const wrapZomeCallWithErrorFactory = <T, E>(
  holochainClient: HolochainClientService,
  zomeName: string,
  fnName: string,
  payload: unknown,
  errorContext: string,
  errorFactory: (error: unknown, context: string) => E
): E.Effect<T, E> =>
  E.tryPromise({
    try: async () => {
      await ensureConnected(holochainClient);
      const result = await holochainClient.callZome(zomeName as ZomeName, fnName, payload);
      return result as T;
    },
    catch: (error) => errorFactory(error, errorContext)
  });
