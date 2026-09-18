import { renderHook } from '@testing-library/react';
import { BigNumber } from 'ethers';
import { describe, expect, it, vi } from 'vitest';

import { WETH_TOKEN_LOGO } from '@/bridge/constants';

import { createWalletTestWrapper } from '../../test-utils/wallet-test-wrapper';
import { defaultWalletContextValue } from '../../wallet/WalletContext';
import type { WalletContextValue } from '../../wallet/types';
import { hasHighUsdSlippage } from './TransferWarningUtils';
import { RouteContext } from './hooks/useRouteStore';
import { getAmountToPay, useTransferReadiness } from './useTransferReadiness';

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
  isDepositMode: true,
  sourceBalance: '100000000',
  sourceGasBalance: '1000000000000000000',
  amount: '10',
}));
vi.mock('@uidotdev/usehooks', () => ({
  useLocalStorage: () => [true],
  useDebounce: (value: unknown) => value,
}));
vi.mock('../../hooks/useArbQueryParams', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../hooks/useArbQueryParams')>()),
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
vi.mock('../../hooks/useNetworksRelationship', () => ({
  useNetworksRelationship: () => ({
    childChain: data.isDepositMode ? data.destinationChain : data.sourceChain,
    isDepositMode: data.isDepositMode,
  }),
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
    sourceBalance: BigNumber.from(data.sourceBalance),
    sourceGasBalance: BigNumber.from(data.sourceGasBalance),
    destinationGasBalance: BigNumber.from(100_000_000),
  }),
}));
vi.mock('../../hooks/useBalanceOnSourceChain', () => ({
  useBalanceOnSourceChain: () => BigNumber.from(100_000_000),
}));
vi.mock('./hooks/useDestinationAddressError', () => ({
  useDestinationAddressError: () => ({ destinationAddressError: undefined }),
}));

const eth = {
  address: '0x0000000000000000000000000000000000000000',
  symbol: 'ETH',
  decimals: 18,
  logoURI: WETH_TOKEN_LOGO,
};
const usdc = {
  address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  symbol: 'USDC',
  decimals: 6,
  logoURI:
    'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/logo.png',
};

function getMock({
  gas,
  fee,
  fromAmount,
}: {
  gas: Omit<RouteContext['gas'][number], 'details' | 'chainId'> & { chainId?: number };
  fee: Omit<RouteContext['fee'][number], 'details' | 'chainId'> & { chainId?: number };
  fromAmount: RouteContext['fromAmount'];
}): RouteContext {
  return {
    type: 'lifi',
    gas: [
      {
        ...gas,
        chainId: gas.chainId ?? 1,
        details: { id: 'gas', label: 'Gas fee', via: 'LI.FI' },
      },
    ],
    fee: [
      {
        ...fee,
        chainId: fee.chainId ?? 1,
        details: { id: 'fee', label: 'Bridge fee', via: 'LI.FI' },
      },
    ],
    fromAmount,
    toAmount: {
      amount: '306496651855301',
      amountUSD: '1.1437',
      token: {
        address: '0x0000000000000000000000000000000000000000',
        symbol: 'ETH',
        decimals: 18,
        logoURI: WETH_TOKEN_LOGO,
      },
    },
    durationMs: 4000,
    fromChainId: 1,
    toChainId: 42161,
    protocolData: {
      route: { id: 'route-id', steps: [] } as unknown as RouteContext['protocolData']['route'],
    },
  };
}

describe('getAmountToPay', () => {
  it('should return the amount with token when token sent is the gas token', () => {
    const { amounts, fromAmountUsd } = getAmountToPay(
      getMock({
        gas: {
          amount: '70000',
          amountUSD: '0.596',
          token: eth,
        },
        fee: {
          amount: '35000',
          amountUSD: '0.298',
          token: eth,
        },
        fromAmount: {
          amount: '306838702657301',
          amountUSD: '1.1450',
          token: eth,
        },
      }),
    );
    expect(fromAmountUsd).toBeCloseTo(2.039);
    expect(amounts).toStrictEqual({
      '1:0x0000000000000000000000000000000000000000': {
        amount: '306838702762301',
        token: {
          address: '0x0000000000000000000000000000000000000000',
          decimals: 18,
          logoURI: WETH_TOKEN_LOGO,
          symbol: 'ETH',
        },
        chainId: 1,
      },
    });
  });

  it('should return the different amounts with tokens when token sent is not the gas token', () => {
    const { amounts, fromAmountUsd } = getAmountToPay(
      getMock({
        gas: {
          amount: '70000',
          amountUSD: '0.596',
          token: eth,
        },
        fee: {
          amount: '35000',
          amountUSD: '0.298',
          token: eth,
        },
        fromAmount: {
          amount: '10000000',
          amountUSD: '10',
          token: usdc,
        },
      }),
    );

    expect(fromAmountUsd).toBeCloseTo(10.894);
    expect(amounts).toStrictEqual({
      '1:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': {
        amount: '10000000',
        token: usdc,
        chainId: 1,
      },
      '1:0x0000000000000000000000000000000000000000': {
        amount: '105000',
        token: eth,
        chainId: 1,
      },
    });
  });

  it('should keep native gas costs separated by chain', () => {
    const { amounts, fromAmountUsd } = getAmountToPay({
      ...getMock({
        gas: {
          amount: '70000',
          amountUSD: '0.596',
          token: eth,
        },
        fee: {
          amount: '35000',
          amountUSD: '0.298',
          token: eth,
        },
        fromAmount: {
          amount: '10000000',
          amountUSD: '10',
          token: usdc,
        },
      }),
      gas: [
        {
          amount: '70000',
          amountUSD: '0.596',
          token: eth,
          chainId: 1,
          details: { id: 'source-gas', label: 'Source gas fee', via: 'LI.FI' },
        },
        {
          amount: '90000',
          amountUSD: '0.700',
          token: eth,
          chainId: 42161,
          details: { id: 'destination-gas', label: 'Destination gas fee', via: 'LI.FI' },
        },
      ],
    });

    expect(fromAmountUsd).toBeCloseTo(11.594);
    expect(amounts['1:0x0000000000000000000000000000000000000000']).toMatchObject({
      amount: '105000',
      chainId: 1,
    });
    expect(amounts['42161:0x0000000000000000000000000000000000000000']).toMatchObject({
      amount: '90000',
      chainId: 42161,
    });
  });

  it('treats missing gas and fee USD values as zero', () => {
    const route = getMock({
      gas: {
        amount: '70000',
        amountUSD: '0',
        token: eth,
      },
      fee: {
        amount: '35000',
        amountUSD: '0',
        token: eth,
      },
      fromAmount: {
        amount: '10000000',
        amountUSD: '10',
        token: usdc,
      },
    });
    route.gas[0]!.amountUSD = undefined;
    route.fee[0]!.amountUSD = undefined;

    expect(getAmountToPay(route).fromAmountUsd).toBe(10);
  });

  it('preserves returned zero USD values', () => {
    const route = getMock({
      gas: { amount: '70000', amountUSD: '0', token: eth },
      fee: { amount: '35000', amountUSD: '0', token: eth },
      fromAmount: { amount: '10000000', amountUSD: '0', token: usdc },
    });
    route.toAmount.amountUSD = '0';

    const { fromAmountUsd, toAmountUsd } = getAmountToPay(route);
    expect(fromAmountUsd).toBe(0);
    expect(toAmountUsd).toBe(0);
  });

  it('preserves the precision of USD values returned by the route API', () => {
    const route = getMock({
      gas: { amount: '70000', amountUSD: '0.0004', token: eth },
      fee: { amount: '35000', amountUSD: '0.0004', token: eth },
      fromAmount: { amount: '10000000', amountUSD: '1', token: usdc },
    });

    expect(getAmountToPay(route).fromAmountUsd).toBeCloseTo(1.0008);
  });

  it('includes the transfer, fee, and gas in the USD slippage check', () => {
    const route = getMock({
      gas: { amount: '70000', amountUSD: '4', token: eth },
      fee: { amount: '35000', amountUSD: '2', token: eth },
      fromAmount: { amount: '10000000', amountUSD: '1', token: usdc },
    });
    route.toAmount.amountUSD = '0.30';

    const { fromAmountUsd, toAmountUsd } = getAmountToPay(route);

    expect(fromAmountUsd).toBe(7);
    expect(hasHighUsdSlippage({ fromAmountUsd, toAmountUsd })).toBe(true);
  });
});

const connectedWallets: WalletContextValue = {
  ...defaultWalletContextValue,
  evm: {
    ...defaultWalletContextValue.evm,
    isConnected: true,
    account: {
      ecosystem: 'evm',
      address: '0x1111111111111111111111111111111111111111',
      status: 'connected',
    },
  },
};

function renderReadiness(wallets = connectedWallets) {
  // `useNetworks` is mocked, so the query only has to satisfy the wrapper
  return renderHook(() => useTransferReadiness(), {
    wrapper: createWalletTestWrapper({ wallets, query: {} }),
  });
}

describe.sequential('custom gas token decimals', () => {
  it.each([
    { amount: '10', allowed: true },
    { amount: '100', allowed: true },
    { amount: '101', allowed: false },
  ])('checks a deposit of $amount against 100 six-decimal tokens', ({ amount, allowed }) => {
    data.amount = amount;
    const { result } = renderReadiness();
    expect(result.current.transferReady.deposit).toBe(allowed);
    if (allowed) expect(result.current.errorMessages).toBeUndefined();
    else expect(result.current.errorMessages?.inputAmount1).toContain('Insufficient');
  });

  it.each([
    { amount: '100', allowed: true },
    { amount: '101', allowed: false },
  ])(
    'checks a withdrawal of $amount against 100 native tokens on the child chain',
    ({ amount, allowed }) => {
      Object.assign(data, {
        amount,
        isDepositMode: false,
        sourceChain: {
          id: 42161,
          name: 'Custom token chain',
          nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 },
        },
        destinationChain: {
          id: 1,
          name: 'Ethereum',
          nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
        },
        sourceBalance: '100000000000000000000',
        sourceGasBalance: '100000000000000000000',
      });
      const { result } = renderReadiness();
      expect(result.current.transferReady.withdrawal).toBe(allowed);
      if (!allowed) expect(result.current.errorMessages?.inputAmount1).toContain('Insufficient');
    },
  );
});

describe.sequential('source wallet', () => {
  it('is not ready while the source wallet is disconnected', () => {
    Object.assign(data, { amount: '1' });
    const { result } = renderReadiness(defaultWalletContextValue);
    expect(result.current.transferReady).toEqual({ deposit: false, withdrawal: false });
  });
});
