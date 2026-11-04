import { decodeHashFromBase64, type AppClient } from '@holochain/client';
import type { NdoAnchorEntry } from '@nondominium/shared-types';
import {
  decodeNdoAnchorRecord,
  groupProfileFromRecord,
  type GroupHolochainRecord
} from '../services/group-clone.helpers';
import { getMossGroupCell } from './group-cell';

/**
 * The NDO anchors of the tool instance's group, read straight through the
 * applet client Moss passes to `AppletServices`. `search` and `getAssetInfo`
 * run outside the UI's stores, so they cannot use the client service.
 * Empty before the group profile has synced into this agent's cell.
 */
export async function loadGroupAnchors(client: AppClient): Promise<NdoAnchorEntry[]> {
  const cell = getMossGroupCell(await client.appInfo());
  if (!cell) return [];
  const call = <T>(fn_name: string, payload: unknown) =>
    client.callZome({ cell_id: cell.cellId, zome_name: 'zome_group', fn_name, payload }) as Promise<T>;

  const profileRecord = await call<GroupHolochainRecord | null>('get_my_group', null);
  const profile = profileRecord ? groupProfileFromRecord(profileRecord) : null;
  if (!profile) return [];

  const records = await call<GroupHolochainRecord[]>('get_ndo_anchors', decodeHashFromBase64(profile.groupHashB64));
  return records.map(decodeNdoAnchorRecord).filter((anchor): anchor is NdoAnchorEntry => anchor !== null);
}
