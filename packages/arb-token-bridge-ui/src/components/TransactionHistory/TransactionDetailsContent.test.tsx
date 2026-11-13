import { cleanup, render, screen } from '@testing-library/react';
import { constants, utils } from 'ethers';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getProviderForChainId } from '@/token-bridge-sdk/utils';

import { prepareLifiTransactionForStorage } from '../../hooks/useLifiMergedTransactionCacheStore';
import { LifiMergedTransaction, WithdrawalStatus } from '../../state/app/state';
import { createMockLifiPartialTransaction, createMockLifiTransaction } from '../../test-utils/lifi';
import { ChainId } from '../../types/ChainId';
import { getLifiTransactionSnapshot } from '../../util/LifiRouteUtils';
import { TransactionDetailsContent } from './TransactionDetailsContent';

vi.mock('next/image', () => ({
  // eslint-disable-next-line @next/next/no-img-element
  default: ({ alt }: { alt?: string }) => <img alt={alt} />,
}));

vi.mock('@/token-bridge-sdk/utils', () => ({
  getProviderForChainId: vi.fn(),
}));

vi.mock('../common/NetworkImage', () => ({
  NetworkImage: ({ chainId }: { chainId: number }) => <span>Network {chainId}</span>,
}));

vi.mock('../common/SafeImage', () => ({
  // eslint-disable-next-line @next/next/no-img-element
  SafeImage: ({ alt }: { alt?: string }) => <img alt={alt} />,
}));

vi.mock('../../hooks/useETHPrice', () => ({
  useETHPrice: () => ({
    ethToUSD: (eth: number) => eth * 2_000,
  }),
}));

vi.mock('../../hooks/useMode', () => ({
  useMode: () => ({
    embedMode: false,
  }),
}));

vi.mock('../../hooks/useNativeCurrency', () => ({
  useNativeCurrency: () => ({
    decimals: 18,
    logoUrl: null,
    name: 'Ether',
    symbol: 'ETH',
  }),
}));

vi.mock('./TransactionsTableDetailsSteps', () => ({
  TransactionsTableDetailsSteps: () => <div>LiFi steps</div>,
}));

afterEach(cleanup);
beforeEach(() => vi.clearAllMocks());

const usdcArbitrum = {
  address: '0x0000000000000000000000000000000000000001',
  chainId: ChainId.ArbitrumOne,
  decimals: 6,
  logoURI: 'https://example.com/usdc.png',
  name: 'USD Coin',
  priceUSD: '1',
  symbol: 'USDC',
};

const usdcEthereum = {
  ...usdcArbitrum,
  chainId: ChainId.Ethereum,
};

const dogeEthereum = {
  address: '0x0000000000000000000000000000000000000002',
  chainId: ChainId.Ethereum,
  decimals: 6,
  logoURI: 'https://example.com/doge.png',
  name: 'Dogecoin',
  priceUSD: '0.0096',
  symbol: 'DOGE',
};

const baseLifiTransaction: LifiMergedTransaction = createMockLifiTransaction({
  txId: '0xsource',
  asset: 'USDC',
  createdAt: new Date('2023-08-01T23:44:00').getTime(),
  status: WithdrawalStatus.CONFIRMED,
  value: '100',
  destination: '0x35d5f73284e29fd794ca17de75e88db60f9ea4c1',
  tokenAddress: constants.AddressZero,
  parentChainId: ChainId.Ethereum,
  childChainId: ChainId.ArbitrumOne,
  sourceChainId: ChainId.ArbitrumOne,
  destinationChainId: ChainId.Ethereum,
  toolsDetails: [
    { key: 'relay', name: 'Relay', logoURI: 'https://example.com/relay.png' },
    { key: 'fly', name: 'Fly', logoURI: 'https://example.com/fly.png' },
  ],
  durationMs: 0,
  fromAmount: {
    amount: utils.parseUnits('100', 6).toString(),
    amountUSD: '100',
    token: usdcArbitrum,
  },
  toAmount: {
    amount: utils.parseUnits('10403.34', 6).toString(),
    amountUSD: '100',
    token: dogeEthereum,
  },
  lifiRoute: {
    steps: [
      {
        id: 'bridge-step',
        toolDetails: {
          key: 'relay',
          name: 'RelayDepository',
          logoURI: 'https://example.com/relay-depository.png',
        },
        action: {
          fromAmount: utils.parseUnits('100', 6).toString(),
          fromChainId: ChainId.ArbitrumOne,
          fromToken: usdcArbitrum,
          toChainId: ChainId.Ethereum,
          toToken: usdcEthereum,
        },
        estimate: {
          fromAmountUSD: '100',
          toAmount: utils.parseUnits('100', 6).toString(),
          toAmountUSD: '100',
        },
      },
      {
        id: 'swap-step',
        toolDetails: {
          key: 'fly',
          name: 'Fly',
          logoURI: 'https://example.com/fly.png',
        },
        action: {
          fromAmount: utils.parseUnits('100', 6).toString(),
          fromChainId: ChainId.Ethereum,
          fromToken: usdcEthereum,
          toChainId: ChainId.Ethereum,
          toToken: dogeEthereum,
        },
        estimate: {
          fromAmountUSD: '100',
          toAmount: utils.parseUnits('10403.34', 6).toString(),
          toAmountUSD: '100',
        },
      },
    ],
  } as unknown as LifiMergedTransaction['lifiRoute'],
});

describe.sequential('TransactionDetailsContent', () => {
  it.each(
    ['route', 'compact', 'api'].flatMap((source) =>
      [
        { amount: '16206962210', label: '16,207 USDC (Ethereum)' },
        { amount: '8103481105', label: '8,103.4811 USDC (Ethereum)' },
      ].map((output) => ({ source, ...output })),
    ),
  )(
    'shows LI.FI output in details and the quote in the list, source=$source amount=$amount',
    ({ source, amount, label }) => {
      const transaction = createMockLifiPartialTransaction();
      transaction.destinationTxId = '0x' + 'a'.repeat(64);
      const execution = transaction.lifiRoute?.steps.at(-1)?.execution;
      if (!execution) throw new Error('Missing fixture execution');
      execution.toAmount = amount;
      const tx = source === 'route' ? transaction : prepareLifiTransactionForStorage(transaction);
      if (source === 'api') {
        tx.receivedAmount = tx.lifiRouteSteps?.at(-1)?.displaySteps.at(-1)?.toAmount;
        tx.lifiRouteSteps = undefined;
      }

      render(<TransactionDetailsContent tx={tx} />);

      expect(screen.getByText(label)).toBeDefined();
      expect(screen.queryByText('8,126.6137 USDG (Ethereum)')).toBeNull();
      expect(getLifiTransactionSnapshot(tx)?.toAmount).toMatchObject({
        amount: '8126613689',
        token: { symbol: 'USDG' },
      });
      expect(getProviderForChainId).not.toHaveBeenCalled();
    },
  );

  it.each([undefined, 'PENDING', 'FAILED', 'DONE'] as const)(
    'preserves the intermediate output and the final step with status %s',
    (status) => {
      cleanup();
      const tx = createMockLifiPartialTransaction();
      const bridge = tx.lifiRoute?.steps[0];
      if (!tx.lifiRoute || !bridge?.execution) throw new Error('Missing fixture bridge');
      tx.receivedAmount = {
        amount: '16206962210',
        amountUSD: '16206.96',
        token: usdcEthereum,
      };
      tx.lifiRoute.steps.push({
        ...bridge,
        id: 'destination-swap',
        toolDetails: { key: 'fly', name: 'Fly', logoURI: '' },
        includedSteps: [],
        action: { ...bridge.action, fromChainId: 1, fromToken: bridge.action.toToken },
        execution: status ? { ...bridge.execution, status, toAmount: '8103481105' } : undefined,
      });

      render(<TransactionDetailsContent tx={tx} />);

      expect(screen.getByText('SYMBIOSIS (LiFi)')).toBeDefined();
      expect(screen.getByText('16,207 USDC (Ethereum)')).toBeDefined();
      expect(screen.getByText('FLY (LiFi)')).toBeDefined();
      expect(
        screen.getByText(
          status === 'DONE' ? '8,103.4811 USDC (Ethereum)' : '8,126.6137 USDG (Ethereum)',
        ),
      ).toBeDefined();
      expect(getProviderForChainId).not.toHaveBeenCalled();
    },
  );

  it('uses refreshed received output over stale compact display steps', () => {
    cleanup();
    const tx = prepareLifiTransactionForStorage(createMockLifiPartialTransaction());
    if (!tx.toAmount) throw new Error('Missing fixture output');
    const output = tx.lifiRouteSteps?.at(-1)?.displaySteps.at(-1)?.toAmount;
    if (!output) throw new Error('Missing fixture received output');
    tx.receivedAmount = { ...output, amount: '8103481105' };

    render(<TransactionDetailsContent tx={tx} />);

    expect(screen.getByText('8,103.4811 USDC (Ethereum)')).toBeDefined();
    expect(screen.queryByText('16,207 USDC (Ethereum)')).toBeNull();
  });

  it.each([false, true])('shows API-only received output, quote available=%s', (hasQuote) => {
    cleanup();
    const tx = prepareLifiTransactionForStorage(createMockLifiPartialTransaction());
    tx.receivedAmount = tx.lifiRouteSteps?.at(-1)?.displaySteps.at(-1)?.toAmount;
    tx.lifiRouteSteps = undefined;
    if (!hasQuote) tx.toAmount = undefined;

    render(<TransactionDetailsContent tx={tx} />);

    expect(screen.getByText('16,207 USDC (Ethereum)')).toBeDefined();
  });

  it('renders LiFi details without loading a native bridge provider', () => {
    render(<TransactionDetailsContent tx={baseLifiTransaction} />);

    expect(getProviderForChainId).not.toHaveBeenCalled();
    expect(screen.getByText('Tokens')).toBeDefined();
  });

  it('renders LiFi multi-step token and tool flow in the details view', () => {
    cleanup();

    render(
      <TransactionDetailsContent
        tx={baseLifiTransaction}
        walletAddress="0x1111111111111111111111111111111111111111"
      />,
    );

    expect(screen.getByText('Tokens')).toBeDefined();
    expect(screen.getByText('100 USDC (Arbitrum One)')).toBeDefined();
    expect(screen.getByText('RELAY (LiFi)')).toBeDefined();
    expect(screen.queryByText('RELAYDEPOSITORY (LiFi)')).toBeNull();
    expect(screen.getByText('100 USDC (Ethereum)')).toBeDefined();
    expect(screen.getByText('FLY (LiFi)')).toBeDefined();
    expect(screen.getByText('10,403 DOGE (Ethereum)')).toBeDefined();
    expect(screen.getByAltText('Arbitrum One logo')).toBeDefined();
    expect(screen.getAllByAltText('Ethereum logo')).toHaveLength(2);
    expect(screen.getByText(`Network ${ChainId.ArbitrumOne}`)).toBeDefined();
    expect(screen.getAllByText('$100')).toHaveLength(3);
    expect(screen.getByText('LiFi steps')).toBeDefined();
    expect(screen.getByText('0x35d5f73284e29fd794ca17de75e88db60f9ea4c1')).toBeDefined();
    expect(screen.queryByText('Bridge')).toBeNull();
  });

  it('preserves the LiFi multi-step token and tool flow after route compaction', () => {
    cleanup();

    render(
      <TransactionDetailsContent
        tx={{
          ...baseLifiTransaction,
          destinationStatus: WithdrawalStatus.CONFIRMED,
          lifiRoute: undefined,
          lifiRouteSteps: baseLifiTransaction.lifiRoute?.steps.map((step) => ({
            id: step.id,
            fromChainId: step.action.fromChainId,
            displaySteps: [
              {
                toolDetails:
                  baseLifiTransaction.toolsDetails?.find(
                    (tool) => tool.key === step.toolDetails.key,
                  ) ?? step.toolDetails,
                toAmount: {
                  amount: step.estimate.toAmount,
                  amountUSD: step.estimate.toAmountUSD ?? '0',
                  chainId: step.action.toChainId,
                  token: step.action.toToken,
                },
              },
            ],
          })),
        }}
        walletAddress="0x1111111111111111111111111111111111111111"
      />,
    );

    expect(screen.getByText('Tokens')).toBeDefined();
    expect(screen.getByText('100 USDC (Arbitrum One)')).toBeDefined();
    expect(screen.getByText('RELAY (LiFi)')).toBeDefined();
    expect(screen.getByText('100 USDC (Ethereum)')).toBeDefined();
    expect(screen.getByText('FLY (LiFi)')).toBeDefined();
    expect(screen.getByText('10,403 DOGE (Ethereum)')).toBeDefined();
    expect(screen.getAllByText('$100')).toHaveLength(3);
  });

  it('renders a singular token section for a single-step LiFi route', () => {
    cleanup();

    render(
      <TransactionDetailsContent
        tx={{
          ...baseLifiTransaction,
          toAmount: {
            amount: utils.parseUnits('100', 6).toString(),
            amountUSD: '100',
            token: usdcEthereum,
          },
          lifiRoute: {
            steps: [baseLifiTransaction.lifiRoute?.steps[0]],
          } as unknown as LifiMergedTransaction['lifiRoute'],
        }}
        walletAddress="0x1111111111111111111111111111111111111111"
      />,
    );

    expect(screen.getByText('Token')).toBeDefined();
    expect(screen.queryByText('Tokens')).toBeNull();
    expect(screen.getByText('100 USDC (Arbitrum One)')).toBeDefined();
    expect(screen.getByText('RELAY (LiFi)')).toBeDefined();
    expect(screen.getByText('100 USDC (Ethereum)')).toBeDefined();
    expect(screen.queryByText('FLY (LiFi)')).toBeNull();
  });

  it('renders a migrated single-step LiFi transaction without route data', () => {
    cleanup();

    render(
      <TransactionDetailsContent
        tx={
          {
            ...baseLifiTransaction,
            lifiRoute: undefined,
            lifiRouteSteps: undefined,
            fromAmount: {
              ...baseLifiTransaction.fromAmount,
              amount: utils.parseUnits('100', 6),
            },
            toAmount: {
              ...baseLifiTransaction.toAmount,
              amount: utils.parseUnits('10403.34', 6),
            },
          } as unknown as LifiMergedTransaction
        }
        walletAddress="0x1111111111111111111111111111111111111111"
      />,
    );

    expect(screen.getByText('Token')).toBeDefined();
    expect(screen.getByText('100 USDC (Arbitrum One)')).toBeDefined();
    expect(screen.getByText('RELAY (LiFi)')).toBeDefined();
    expect(screen.getByText('10,403 DOGE (Ethereum)')).toBeDefined();
  });
});
