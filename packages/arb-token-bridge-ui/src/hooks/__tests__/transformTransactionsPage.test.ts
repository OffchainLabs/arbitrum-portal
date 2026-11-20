import { describe, expect, it, vi } from 'vitest';

import { MergedTransaction } from '../../state/app/state';
import { captureSentryErrorWithExtraData } from '../../util/SentryUtils';
import { Transfer, transformTransactionsPage } from '../useTransactionHistory';

vi.mock('../../util/SentryUtils', () => ({
  captureSentryErrorWithExtraData: vi.fn(),
}));

const deposit = (txID: string) =>
  ({ txID, direction: 'deposit', parentChainId: 1, childChainId: 42170 }) as unknown as Transfer;

describe('transformTransactionsPage', () => {
  it('keeps the txs that loaded and reports the ones that failed', async () => {
    const txs = [deposit('0x1'), deposit('0x2'), deposit('0x3')];
    const transform = vi.fn(async (tx: Transfer) => {
      if ((tx as { txID: string }).txID === '0x2') {
        throw new Error('rpc down');
      }
      return { txId: (tx as { txID: string }).txID } as unknown as MergedTransaction;
    });

    const page = await transformTransactionsPage(txs, transform);

    expect(page.transactions.map((tx) => tx.txId)).toEqual(['0x1', '0x3']);
    expect(page.failedTxs).toEqual([
      { txId: '0x2', txChainId: 1, parentChainId: 1, childChainId: 42170 },
    ]);
    expect(captureSentryErrorWithExtraData).toHaveBeenCalledWith(
      expect.objectContaining({
        additionalData: { txId: '0x2', parentChainId: '1', childChainId: '42170' },
      }),
    );
  });

  it('returns every tx as failed when all of them fail', async () => {
    const page = await transformTransactionsPage([deposit('0x1')], async () => {
      throw new Error('rpc down');
    });

    expect(page.transactions).toEqual([]);
    expect(page.failedTxs).toHaveLength(1);
  });
});
