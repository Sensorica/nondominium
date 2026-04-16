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

/** Resolves `EconomicResource` entries plus their create `ActionHash` from conductor `Record[]`. */
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
    const present = (entry as { Present?: { entry: unknown } }).Present;
    if (present?.entry !== undefined && isEconomicResource(present.entry)) {
      out.push({ actionHash, resource: present.entry });
    }
  }
  return out;
}
