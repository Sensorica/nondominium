import { decode } from '@msgpack/msgpack';
import type { ActionHash, Record as HoloRecord } from '@holochain/client';
import type { EconomicResource } from '@nondominium/shared-types';

function isEconomicResource(x: unknown): x is EconomicResource {
  if (typeof x !== 'object' || x === null) return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o.quantity === 'number' &&
    typeof o.unit === 'string' &&
    o.custodian instanceof Uint8Array &&
    typeof o.state === 'string'
  );
}

/** Best-effort extraction of app `EconomicResource` entries from zome `Record[]` payloads. */
export function economicResourcesFromRecords(data: unknown): EconomicResource[] {
  return economicResourceRowsFromRecords(data).map((r) => r.resource);
}

export interface EconomicResourceRow {
  actionHash: ActionHash;
  resource: EconomicResource;
}

/** Resolves `EconomicResource` entries plus their create `ActionHash` from conductor `Record[]`.
 *
 * Holochain `Record.entry` is a discriminated union `{ Present: Entry } | { Hidden: void } | ...`.
 * For app entries, `Entry` uses Rust's externally-tagged enum serialization: `{ App: Uint8Array }`
 * where the Uint8Array contains msgpack-encoded entry bytes. This function decodes those bytes
 * and type-guards the result before adding to the output list.
 */
export function economicResourceRowsFromRecords(data: unknown): EconomicResourceRow[] {
  if (!Array.isArray(data)) return [];
  const out: EconomicResourceRow[] = [];
  for (const item of data) {
    if (!item || typeof item !== 'object') continue;
    const rec = item as HoloRecord;
    const hashUnknown = (rec as { signed_action?: { hashed?: { hash?: unknown } } }).signed_action
      ?.hashed?.hash;
    if (!(hashUnknown instanceof Uint8Array) || hashUnknown.length !== 39) continue;
    const actionHash = hashUnknown as ActionHash;
    const entry = rec.entry;
    if (!entry || typeof entry !== 'object') continue;
    if (!('Present' in entry)) continue;
    const present = (entry as { Present: unknown }).Present;
    if (!present || typeof present !== 'object') continue;
    // Rust externally-tagged enum: { App: Uint8Array } for app entries
    const appBytes = (present as Record<string, unknown>)['App'];
    if (!(appBytes instanceof Uint8Array)) continue;
    const decoded = decode(appBytes);
    if (isEconomicResource(decoded)) {
      out.push({ actionHash, resource: decoded });
    }
  }
  return out;
}
