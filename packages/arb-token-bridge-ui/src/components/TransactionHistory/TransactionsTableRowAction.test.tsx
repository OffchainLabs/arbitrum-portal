import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { AssetType } from '../../hooks/arbTokenBridge.types';
import { useClaimWithdrawal } from '../../hooks/useClaimWithdrawal';
import { useRedeemRetryable } from '../../hooks/useRedeemRetryable';
import { DepositStatus, LifiMergedTransaction, WithdrawalStatus } from '../../state/app/state';
import { useClaimCctp } from '../../state/cctpState';
import { ChainId } from '../../types/ChainId';
import { TransactionsTableRowAction } from './TransactionsTableRowAction';

vi.mock('../../hooks/useClaimWithdrawal', () => ({ useClaimWithdrawal: vi.fn() }));
vi.mock('../../hooks/useRedeemRetryable', () => ({ useRedeemRetryable: vi.fn() }));
vi.mock('../../state/cctpState', async (original) => ({
  ...(await original<typeof import('../../state/cctpState')>()),
  useClaimCctp: vi.fn(),
}));

const token = {
  address: '11111111111111111111111111111111',
  chainId: ChainId.Solana,
  decimals: 9,
  symbol: 'SOL',
  name: 'Solana',
  priceUSD: '1',
};
const tx: LifiMergedTransaction = {
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
  sender: 'Hgw1pNJDYm5NbMheUHFNniiqtncor73swrH4RSN9APu5',
  isLifi: true,
  tokenAddress: token.address,
  parentChainId: ChainId.Solana,
  childChainId: ChainId.ArbitrumOne,
  sourceChainId: ChainId.Solana,
  destinationChainId: ChainId.ArbitrumOne,
  toolDetails: { key: 'lifi', name: 'LiFi', logoURI: '' },
  durationMs: 0,
  fromAmount: { amount: '1', amountUSD: '1', token },
  toAmount: { amount: '1', amountUSD: '1', token },
  destinationTxId: null,
};

describe('history action availability', () => {
  it('renders a settled Solana record without mounting canonical claim or redeem hooks', () => {
    expect(
      renderToStaticMarkup(<TransactionsTableRowAction tx={tx} isError={false} type="deposits" />),
    ).toBe('');
    expect(useClaimWithdrawal).not.toHaveBeenCalled();
    expect(useClaimCctp).not.toHaveBeenCalled();
    expect(useRedeemRetryable).not.toHaveBeenCalled();
  });
});
