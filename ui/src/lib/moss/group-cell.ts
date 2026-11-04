import { CellType, type AppInfo, type CellInfo } from '@holochain/client';
import type { GroupCellInfo } from '../services/group-clone.helpers';

/**
 * Inside Moss there is exactly one Nondominium group: the tool instance's own
 * `group` cell. This is its id wherever the standalone UI would use the clone's
 * network seed.
 */
export const MOSS_GROUP_ID = 'moss';

/**
 * The `group` cell Moss installs for the tool instance. Moss provisions every
 * role of the manifest, deferred ones included (verified in the #162 spike), so
 * unlike the standalone model this cell is provisioned, not cloned.
 */
export function getMossGroupCell(appInfo: AppInfo | null): GroupCellInfo | null {
  const cells: CellInfo[] = appInfo?.cell_info?.['group'] ?? [];
  for (const cellInfo of cells) {
    if (cellInfo.type !== CellType.Provisioned) continue;
    const { cell_id, dna_modifiers } = cellInfo.value;
    const seed = dna_modifiers?.network_seed;
    return {
      networkSeed: typeof seed === 'string' && seed ? seed : MOSS_GROUP_ID,
      dnaHash: cell_id[0],
      cellId: cell_id,
      cloneId: 'group',
      enabled: true
    };
  }
  return null;
}
