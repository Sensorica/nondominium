import { describe, it, expect } from 'vitest';
import { CellType, type AppInfo } from '@holochain/client';
import { MOSS_GROUP_ID, getMossGroupCell } from './group-cell';

const dna = new Uint8Array([1, 2, 3]);
const agent = new Uint8Array([9, 9, 9]);

function appInfo(cellInfo: Record<string, unknown[]>): AppInfo {
  return { cell_info: cellInfo } as unknown as AppInfo;
}

describe('getMossGroupCell', () => {
  it('returns the provisioned group cell Moss installs for the tool instance', () => {
    const cell = getMossGroupCell(
      appInfo({
        group: [
          {
            type: CellType.Provisioned,
            value: { cell_id: [dna, agent], dna_modifiers: { network_seed: 'instance-seed' } }
          }
        ]
      })
    );
    expect(cell).toEqual({
      networkSeed: 'instance-seed',
      dnaHash: dna,
      cellId: [dna, agent],
      cloneId: 'group',
      enabled: true
    });
  });

  it('ignores cloned group cells, which belong to the standalone model', () => {
    const cell = getMossGroupCell(
      appInfo({
        group: [
          { type: CellType.Cloned, value: { cell_id: [dna, agent], dna_modifiers: { network_seed: 'x' } } }
        ]
      })
    );
    expect(cell).toBeNull();
  });

  it('falls back to the group id when the cell carries no network seed', () => {
    const cell = getMossGroupCell(
      appInfo({ group: [{ type: CellType.Provisioned, value: { cell_id: [dna, agent], dna_modifiers: {} } }] })
    );
    expect(cell?.networkSeed).toBe(MOSS_GROUP_ID);
  });

  it('returns null when the app has no group role or no app info', () => {
    expect(getMossGroupCell(appInfo({}))).toBeNull();
    expect(getMossGroupCell(null)).toBeNull();
  });
});
