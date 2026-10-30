import { decode } from '@msgpack/msgpack';
import type { ActionHash, Record as HoloRecord } from '@holochain/client';
import type { EconomicResource } from '@nondominium/shared-types';

function isEconomicResource(x: unknown): x is EconomicResource {
  if (typeof x !== 'object' || x === null) return false;
  const o = x as Record<string, unknown>;
  const q = o.quantity as Record<string, unknown> | undefined;
  return (
    !!q &&
    typeof q.numerical_value === 'number' &&
    typeof q.has_unit === 'string' &&
    o.custodian instanceof Uint8Array &&
    typeof o.operational_state === 'string'
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

/** Msgpack bytes of an app entry, from either conductor record shape this app sees. */
function appEntryBytes(present: unknown): Uint8Array | null {
  if (!present || typeof present !== 'object') return null;
  const body = present as Record<string, unknown>;
  // `@holochain/client` records: `entry.Present.entry` is the msgpack payload.
  if (body.entry instanceof Uint8Array) return body.entry;
  // Externally tagged Rust `Entry::App`.
  if (body.App instanceof Uint8Array) return body.App;
  return null;
}

/** Resolves `EconomicResource` entries plus their create `ActionHash` from conductor `Record[]`.
 *
 * Holochain `Record.entry` is a discriminated union `{ Present: Entry } | { Hidden: void } | ...`.
 * The present entry's msgpack bytes live on `Present.entry` (client records) or `Present.App`
 * (externally tagged Rust `Entry`). This function decodes those bytes and type-guards the result.
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
    const appBytes = appEntryBytes((entry as { Present: unknown }).Present);
    if (!appBytes) continue;
    const decoded = decode(appBytes);
    if (isEconomicResource(decoded)) {
      out.push({ actionHash, resource: decoded });
    }
  }
  return out;
}
