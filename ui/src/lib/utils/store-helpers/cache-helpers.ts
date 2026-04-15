import { Effect as E, pipe } from 'effect';

/**
 * Minimal cache service interface. The full multi-tier cache service is
 * planned for a later PR — this interface keeps the helper signature stable
 * while leaving the implementation pluggable.
 */
export interface CacheService<K, V> {
  get(key: K): E.Effect<V | undefined, never>;
  set(key: K, value: V): E.Effect<void, never>;
  clear(): E.Effect<void, never>;
  invalidate(key: K): E.Effect<void, never>;
}

/**
 * Build a generic cache-sync helper that wraps an Effect-producing fetcher,
 * checks the cache first, and stores the result on miss. Mutation Effects
 * should additionally call `invalidate(key)` on success.
 */
export function createGenericCacheSyncHelper<K, V, E>(
  cache: CacheService<K, V>
): {
  read: (key: K, fetcher: () => E.Effect<V, E>) => E.Effect<V, E>;
  write: (key: K, value: V) => E.Effect<void, never>;
  evict: (key: K) => E.Effect<void, never>;
  clearAll: () => E.Effect<void, never>;
} {
  return {
    read: (key, fetcher) =>
      pipe(
        cache.get(key),
        E.flatMap((cached) => {
          if (cached !== undefined) return E.succeed(cached);
          return pipe(
            fetcher(),
            E.tap((value) => cache.set(key, value))
          );
        })
      ),
    write: (key, value) => cache.set(key, value),
    evict: (key) => cache.invalidate(key),
    clearAll: () => cache.clear()
  };
}
