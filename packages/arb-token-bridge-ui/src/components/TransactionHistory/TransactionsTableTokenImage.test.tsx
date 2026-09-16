import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AssetType } from '../../hooks/arbTokenBridge.types';
import { DepositStatus, type LifiMergedTransaction, WithdrawalStatus } from '../../state/app/state';
import { ChainId } from '../../types/ChainId';
import { SOLANA_NATIVE_TOKEN_ADDRESS } from '../../wallet/constants';
import { TransactionsTableTokenImage } from './TransactionsTableTokenImage';

vi.mock('../../hooks/useTokenLists', () => ({
  useTokenLists: () => ({ data: [] }),
}));

afterEach(cleanup);

const nativeSolanaTransfer: LifiMergedTransaction = {
  txId: 'signature',
  asset: 'SOL',
  assetType: AssetType.ETH,
  blockNum: null,
  createdAt: 1_700_000_000_000,
  direction: 'deposit',
  isWithdrawal: false,
  resolvedAt: null,
  status: WithdrawalStatus.CONFIRMED,
  destinationStatus: WithdrawalStatus.CONFIRMED,
  uniqueId: null,
  value: '1',
  depositStatus: DepositStatus.LIFI_DEFAULT_STATE,
  destination: '0x1111111111111111111111111111111111111111',
  sender: 'So11111111111111111111111111111111111111112',
  isLifi: true,
  tokenAddress: SOLANA_NATIVE_TOKEN_ADDRESS,
  parentChainId: ChainId.Solana,
  childChainId: ChainId.ArbitrumOne,
  sourceChainId: ChainId.Solana,
  destinationChainId: ChainId.ArbitrumOne,
  toolsDetails: [{ key: 'mayan', name: 'Mayan', logoURI: '' }],
  durationMs: 0,
  fromAmount: {
    amount: '1000000000',
    amountUSD: '1',
    token: { address: SOLANA_NATIVE_TOKEN_ADDRESS, symbol: 'SOL', decimals: 9 },
  },
  toAmount: {
    amount: '1000000000000000000',
    amountUSD: '1',
    token: {
      address: '0x0000000000000000000000000000000000000000',
      symbol: 'ETH',
      decimals: 18,
    },
  },
  destinationTxId: null,
};

describe('TransactionsTableTokenImage', () => {
  it('uses the source chain native-token logo for a Solana transfer', () => {
    render(<TransactionsTableTokenImage tx={nativeSolanaTransfer} />);

    expect(screen.getByRole('img', { name: 'Native token logo' }).getAttribute('src')).toBe(
      '/images/Solana.svg',
    );
  });
});
