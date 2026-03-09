import { describe, it, expect, vi } from 'vitest';
import type { BatchItem } from 'drizzle-orm/batch';
import type { AppDb } from '../../src/db/index.js';
import { batchOps } from '../../src/utils/db.js';

describe('batchOps', () => {
  it('throws when given an empty array', () => {
    const db = { batch: vi.fn() } as unknown as AppDb;
    expect(() => batchOps(db, [])).toThrow('batchOps requires at least one operation');
  });

  it('delegates to db.batch() for non-empty array and returns its result', async () => {
    const mockResult = [{ id: '1' }, { id: '2' }];
    const batchMock = vi.fn().mockResolvedValue(mockResult);
    const db = { batch: batchMock } as unknown as AppDb;

    const ops = [
      { fake: 'op1' } as unknown as BatchItem<'sqlite'>,
      { fake: 'op2' } as unknown as BatchItem<'sqlite'>,
    ];

    const result = await batchOps(db, ops);

    expect(batchMock).toHaveBeenCalledOnce();
    expect(batchMock).toHaveBeenCalledWith(ops);
    expect(result).toBe(mockResult);
  });
});
