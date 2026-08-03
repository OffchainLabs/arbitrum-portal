import { cleanup, render, screen } from '@testing-library/react';
import { constants, utils } from 'ethers';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AssetType } from '../../hooks/arbTokenBridge.types';
import { DepositStatus, LifiMergedTransaction, WithdrawalStatus } from '../../state/app/state';
import { ChainId } from '../../types/ChainId';
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

const baseLifiTransaction: LifiMergedTransaction = {
  txId: '0xsource',
  asset: 'USDC',
  assetType: AssetType.ERC20,
  blockNum: null,
  createdAt: new Date('2023-08-01T23:44:00').getTime(),
  direction: 'deposit',
  isWithdrawal: false,
  resolvedAt: null,
  status: WithdrawalStatus.CONFIRMED,
  destinationStatus: WithdrawalStatus.UNCONFIRMED,
  uniqueId: null,
  value: '100',
  depositStatus: DepositStatus.LIFI_DEFAULT_STATE,
  destination: '0x35d5f73284e29fd794ca17de75e88db60f9ea4c1',
  sender: '0x1111111111111111111111111111111111111111',
  isLifi: true,
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
    amount: utils.parseUnits('100', 6),
    amountUSD: '100',
    token: usdcArbitrum,
  },
  toAmount: {
    amount: utils.parseUnits('10403.34', 6),
    amountUSD: '100',
    token: dogeEthereum,
  },
  destinationTxId: null,
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
};

describe('TransactionDetailsContent', () => {
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

  it('renders a singular token section for a single-step LiFi route', () => {
    cleanup();

    render(
      <TransactionDetailsContent
        tx={{
          ...baseLifiTransaction,
          toAmount: {
            amount: utils.parseUnits('100', 6),
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
