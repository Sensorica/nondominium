import { Effect as E, pipe } from 'effect';

/**
 * Helper for building an entity fetcher that:
 *   1. Calls a service Effect to fetch a list of records
 *   2. Maps each record to a UI entity (filtering out failed mappings)
 *   3. Optionally writes each entity into a cache for future reads
 */
export function createEntityFetcher<TRecord, TEntity, EErr>(
  fetchRecords: () => E.Effect<TRecord[], EErr>,
  mapRecord: (record: TRecord) => TEntity | undefined,
  cacheWrite?: (entity: TEntity) => E.Effect<void, never>
): () => E.Effect<TEntity[], EErr> {
  return () =>
    pipe(
      fetchRecords(),
      E.map((records) => {
        const out: TEntity[] = [];
        for (const r of records) {
          const e = mapRecord(r);
          if (e !== undefined) out.push(e);
        }
        return out;
      }),
      E.tap((entities) => {
        if (!cacheWrite) return E.void;
        return E.forEach(entities, (e) => cacheWrite(e), { discard: true });
      })
    );
}
