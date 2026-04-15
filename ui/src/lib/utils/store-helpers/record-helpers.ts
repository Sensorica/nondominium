import { Effect as E } from 'effect';
import type { Record as HolochainRecord } from '@holochain/client';

/**
 * Helpers that turn raw Holochain `Record` values returned by zome calls
 * into typed UI entity objects. The mapping function must extract whatever
 * fields the UI needs from the record's `entry` and `signed_action`.
 */

/**
 * Convert a single Holochain record into a UI entity object.
 * Returns `undefined` if the record cannot be parsed.
 */
export function createUIEntityFromRecord<TEntity>(
  mapper: (record: HolochainRecord) => TEntity | undefined
): (record: HolochainRecord) => E.Effect<TEntity | undefined, never> {
  return (record) => E.sync(() => mapper(record));
}

/**
 * Convert an array of Holochain records into a typed UI entity array,
 * filtering out any records that fail to map.
 */
export function mapRecordsToUIEntities<TEntity>(
  mapper: (record: HolochainRecord) => TEntity | undefined
): (records: HolochainRecord[]) => E.Effect<TEntity[], never> {
  return (records) =>
    E.sync(() => {
      const out: TEntity[] = [];
      for (const r of records) {
        const entity = mapper(r);
        if (entity !== undefined) out.push(entity);
      }
      return out;
    });
}
