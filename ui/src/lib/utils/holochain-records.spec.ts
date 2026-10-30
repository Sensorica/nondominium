import { encode } from '@msgpack/msgpack';
import { describe, expect, it } from 'vitest';
import { economicResourceRowsFromRecords } from './holochain-records';

function record(entry: unknown) {
  const hash = new Uint8Array(39);
  hash[0] = 0x84;
  return {
    signed_action: { hashed: { hash } },
    entry
  };
}

const resource = {
  quantity: { numerical_value: 1, has_unit: 'each' },
  custodian: new Uint8Array(39),
  operational_state: 'PendingValidation'
};

describe('economicResourceRowsFromRecords', () => {
  it('decodes conductor records whose app entry is Present.entry', () => {
    const rows = economicResourceRowsFromRecords([
      record({ Present: { entry: encode(resource) } })
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.resource.quantity).toEqual({ numerical_value: 1, has_unit: 'each' });
    expect(rows[0]?.resource.operational_state).toBe('PendingValidation');
    expect(rows[0]?.actionHash).toHaveLength(39);
  });

  it('decodes externally tagged Entry::App payloads', () => {
    const rows = economicResourceRowsFromRecords([
      record({ Present: { App: encode(resource) } })
    ]);
    expect(rows).toHaveLength(1);
  });

  it('skips records that are not economic resources', () => {
    const rows = economicResourceRowsFromRecords([
      record({ Present: { entry: encode({ name: 'not a resource' }) } })
    ]);
    expect(rows).toHaveLength(0);
  });
});
