import { BigNumber } from 'ethers';
import { describe, expect, it } from 'vitest';

import { DepositStatus, MergedTransaction, WithdrawalStatus } from '../../state/app/state';
import { AssetType } from '../arbTokenBridge.types';
import { mergeTransactions } from '../useTransactionHistory';

const ADDRESS = '0x1111111111111111111111111111111111111111';

const baseTx = {
  asset: 'ETH',
  assetType: AssetType.ETH,
  blockNum: null,
  resolvedAt: null,
  uniqueId: null as BigNumber | null,
  value: '1',
  tokenAddress: null,
  parentChainId: 1,
  childChainId: 42161,
  sourceChainId: 1,
  destinationChainId: 42161,
  sender: ADDRESS,
  destination: ADDRESS,
};

describe('mergeTransactions', () => {
  it('dedupes a pending session tx once the same tx appears in fetched history', () => {
    const pendingTx: MergedTransaction = {
      ...baseTx,
      createdAt: 1_700_000_000_200,
      txId: '0xabc',
      direction: 'deposit',
      status: 'success',
      isWithdrawal: false,
      depositStatus: DepositStatus.L1_PENDING,
    };

    const fetchedTx: MergedTransaction = {
      ...baseTx,
      createdAt: 1_700_000_000_100,
      txId: '0xabc',
      direction: 'deposit',
      status: 'success',
      isWithdrawal: false,
      depositStatus: DepositStatus.L2_SUCCESS,
    };

    const transactions = mergeTransactions({
      address: ADDRESS,
      newTransactions: [pendingTx],
      fetchedTransactions: [[fetchedTx]],
    });

    expect(transactions).toEqual([fetchedTx]);
  });

  it('keeps distinct transactions and sorts them, newest first', () => {
    const olderTx: MergedTransaction = {
      ...baseTx,
      createdAt: 1_700_000_000_000,
      txId: '0xolder',
      direction: 'withdraw',
      status: WithdrawalStatus.UNCONFIRMED,
      isWithdrawal: true,
    };

    const newerTx: MergedTransaction = {
      ...baseTx,
      createdAt: 1_700_000_000_500,
      txId: '0xnewer',
      direction: 'withdraw',
      status: WithdrawalStatus.UNCONFIRMED,
      isWithdrawal: true,
    };

    const transactions = mergeTransactions({
      address: ADDRESS,
      newTransactions: [olderTx],
      fetchedTransactions: [[newerTx]],
    });

    expect(transactions).toEqual([newerTx, olderTx]);
  });
});
