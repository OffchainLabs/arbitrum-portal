import { renderHook } from '@testing-library/react';
import { BigNumber } from 'ethers';
import { describe, expect, it, vi } from 'vitest';

import { useTransferReadiness } from './useTransferReadiness';

const data = vi.hoisted(() => ({
  sourceChain: {
    id: 1,
    name: 'Ethereum',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  },
  destinationChain: {
    id: 42161,
    name: 'Custom token chain',
    nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 6 },
  },
  amount: '10',
  wallet: {
    ecosystem: 'evm',
    isConnected: true,
    account: { address: '0x1111111111111111111111111111111111111111' },
  },
}));
vi.mock('@uidotdev/usehooks', () => ({
  useLocalStorage: () => [true],
  useDebounce: (value: unknown) => value,
}));
vi.mock('../../hooks/useArbQueryParams', () => ({
  useArbQueryParams: () => [{ amount: data.amount, amount2: '', destinationToken: undefined }],
}));
vi.mock('../../hooks/useSelectedToken', () => ({ useSelectedToken: () => [null] }));
vi.mock('./hooks/useAmountBigNumber', () => ({
  useAmountBigNumber: () => BigNumber.from(data.amount).mul(1_000_000),
}));
vi.mock('../App/AppContext', () => ({
  useAppContextState: () => ({ layout: { isTransferring: false } }),
}));
vi.mock('../../hooks/useNetworks', () => ({ useNetworks: () => [data] }));
vi.mock('../../wallet/hooks/useWallets', () => ({
  useWallets: () => ({ sourceWallet: data.wallet }),
}));
vi.mock('../../hooks/useNetworksRelationship', () => ({
  useNetworksRelationship: () => ({ childChain: data.destinationChain, isDepositMode: true }),
}));
vi.mock('./hooks/useRouteStore', () => ({
  useRouteStore: () => ({ selectedRoute: 'arbitrum', selectedRouteContext: undefined }),
  getSelectedRouteContext: () => undefined,
  isLifiRoute: () => false,
}));
vi.mock('./hooks/useRoutesUpdater', () => ({
  useRouteEligibility: () => ({ eligibleRouteTypes: ['arbitrum'] }),
}));
vi.mock('./hooks/useSelectedTokenIsWithdrawOnly', () => ({
  useSelectedTokenIsWithdrawOnly: () => ({
    isSelectedTokenWithdrawOnly: false,
    isSelectedTokenWithdrawOnlyLoading: false,
  }),
}));
vi.mock('../../hooks/TransferPanel/useGasSummary', () => ({
  useGasSummary: () => ({
    status: 'success',
    estimatedParentChainGasFees: 0,
    estimatedChildChainGasFees: 0,
  }),
}));
vi.mock('../../hooks/useAccountType', () => ({
  useAccountType: () => ({ accountType: 'externally-owned-account' }),
}));
vi.mock('../../hooks/useNativeCurrency', () => ({
  useNativeCurrency: () => ({
    name: 'USDC',
    symbol: 'USDC',
    decimals: 6,
    isCustom: true,
    address: '0x2222222222222222222222222222222222222222',
  }),
}));
vi.mock('./TransferPanelMain/useNativeCurrencyBalances', () => ({
  useNativeCurrencyBalances: () => ({
    sourceBalance: BigNumber.from(100_000_000),
    sourceGasBalance: BigNumber.from('1000000000000000000'),
    destinationGasBalance: BigNumber.from(100_000_000),
  }),
}));
vi.mock('../../hooks/useBalanceOnSourceChain', () => ({
  useBalanceOnSourceChain: () => BigNumber.from(100_000_000),
}));
vi.mock('./hooks/useDestinationAddressError', () => ({
  useDestinationAddressError: () => ({ destinationAddressError: undefined }),
}));

describe.sequential('custom gas token decimals', () => {
  it.each([
    { amount: '10', allowed: true },
    { amount: '100', allowed: true },
    { amount: '101', allowed: false },
  ])('checks a deposit of $amount against 100 six-decimal tokens', ({ amount, allowed }) => {
    data.amount = amount;
    const { result } = renderHook(() => useTransferReadiness());
    expect(result.current.transferReady.deposit).toBe(allowed);
    if (allowed) expect(result.current.errorMessages).toBeUndefined();
    else expect(result.current.errorMessages?.inputAmount1).toContain('Insufficient');
  });
});
