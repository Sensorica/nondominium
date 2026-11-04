import { describe, it, expect, vi } from 'vitest';
import type { NdoAnchorEntry } from '@nondominium/shared-types';
import { ensureNdoCells } from './ndo-cells';

const anchors = ['a', 'b', 'c'].map((name) => ({ name }) as unknown as NdoAnchorEntry);

describe('ensureNdoCells', () => {
  it('joins every anchored NDO cell, one after the other', async () => {
    const order: string[] = [];
    let running = 0;
    let maxRunning = 0;
    const ensure = vi.fn(async (anchor: NdoAnchorEntry) => {
      running += 1;
      maxRunning = Math.max(maxRunning, running);
      await Promise.resolve();
      order.push((anchor as unknown as { name: string }).name);
      running -= 1;
    });
    const result = await ensureNdoCells(anchors, ensure);
    expect(order).toEqual(['a', 'b', 'c']);
    expect(maxRunning).toBe(1);
    expect(result).toEqual({ joined: 3, failed: 0 });
  });

  it('keeps going when one cell fails, and counts it', async () => {
    const ensure = vi.fn(async (anchor: NdoAnchorEntry) => {
      if ((anchor as unknown as { name: string }).name === 'b') throw new Error('network');
    });
    const result = await ensureNdoCells(anchors, ensure);
    expect(ensure).toHaveBeenCalledTimes(3);
    expect(result).toEqual({ joined: 2, failed: 1 });
  });

  it('does nothing for no anchors', async () => {
    expect(await ensureNdoCells([], vi.fn())).toEqual({ joined: 0, failed: 0 });
  });
});
