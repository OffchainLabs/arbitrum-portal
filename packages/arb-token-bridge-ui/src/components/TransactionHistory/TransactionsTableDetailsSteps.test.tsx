import { cleanup, render, screen, within } from '@testing-library/react';
import { constants, utils } from 'ethers';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AssetType } from '../../hooks/arbTokenBridge.types';
import { DepositStatus, LifiMergedTransaction, WithdrawalStatus } from '../../state/app/state';
import { ChainId } from '../../types/ChainId';
import { getLifiRouteHistorySteps } from '../../util/LifiRouteUtils';
import { TransactionsTableDetailsSteps } from './TransactionsTableDetailsSteps';

vi.mock('../../hooks/useTransferDuration', () => ({
  minutesToHumanReadableTime: (minutes: number) => `${minutes} minutes`,
  useTransferDuration: () => ({
    approximateDurationInMinutes: 15,
  }),
}));

vi.mock('./TransactionsTableRowAction', () => ({
  TransactionsTableRowAction: () => <button>Action</button>,
}));

afterEach(cleanup);

const usdcArbitrum = {
  address: constants.AddressZero,
  chainId: ChainId.ArbitrumOne,
  decimals: 6,
  logoURI: '',
  name: 'USD Coin',
  priceUSD: '1',
  symbol: 'USDC',
};

const usdcEthereum = {
  ...usdcArbitrum,
  chainId: ChainId.Ethereum,
};

function withRouteHistory(tx: LifiMergedTransaction): LifiMergedTransaction {
  return {
    ...tx,
    lifiRouteSteps: getLifiRouteHistorySteps(tx.lifiRoute),
  };
}

const baseLifiTransaction: LifiMergedTransaction = withRouteHistory({
  txId: '0xsource',
  asset: 'USDC',
  assetType: AssetType.ERC20,
  blockNum: null,
  createdAt: 1_700_000_000_000,
  direction: 'deposit',
  isWithdrawal: false,
  resolvedAt: null,
  status: WithdrawalStatus.CONFIRMED,
  destinationStatus: WithdrawalStatus.UNCONFIRMED,
  uniqueId: null,
  value: '100',
  depositStatus: DepositStatus.LIFI_DEFAULT_STATE,
  destination: '0x1111111111111111111111111111111111111111',
  sender: '0x1111111111111111111111111111111111111111',
  isLifi: true,
  tokenAddress: constants.AddressZero,
  parentChainId: ChainId.Ethereum,
  childChainId: ChainId.ArbitrumOne,
  sourceChainId: ChainId.ArbitrumOne,
  destinationChainId: ChainId.Ethereum,
  toolsDetails: [{ key: 'across', name: 'Across', logoURI: '' }],
  durationMs: 0,
  fromAmount: {
    amount: utils.parseUnits('100', 6).toString(),
    amountUSD: '100',
    token: usdcArbitrum,
  },
  toAmount: {
    amount: utils.parseUnits('100', 6).toString(),
    amountUSD: '100',
    token: usdcEthereum,
  },
  destinationTxId: null,
  lifiRoute: {
    steps: [
      {
        id: 'bridge-step',
        action: {
          fromAmount: utils.parseUnits('100', 6).toString(),
          fromChainId: ChainId.ArbitrumOne,
          fromToken: usdcArbitrum,
          toChainId: ChainId.Ethereum,
          toToken: usdcEthereum,
        },
        estimate: {
          toAmount: utils.parseUnits('100', 6).toString(),
        },
        execution: {
          status: 'DONE',
          process: [
            {
              type: 'CROSS_CHAIN',
              status: 'DONE',
              txHash: '0xsource',
              startedAt: 1,
            },
          ],
        },
      },
      {
        id: 'swap-step',
        action: {
          fromAmount: utils.parseUnits('100', 6).toString(),
          fromChainId: ChainId.Ethereum,
          fromToken: usdcEthereum,
          toChainId: ChainId.Ethereum,
          toToken: usdcEthereum,
        },
        estimate: {
          toAmount: utils.parseUnits('100', 6).toString(),
        },
      },
    ],
  } as unknown as LifiMergedTransaction['lifiRoute'],
});

describe('TransactionsTableDetailsSteps', () => {
  it('renders LiFi step approvals for each saved route step', () => {
    render(<TransactionsTableDetailsSteps tx={baseLifiTransaction} />);

    expect(screen.getByText('Transaction initiated on Arbitrum One')).toBeDefined();
    expect(screen.getByText('Approve transaction on Arbitrum One')).toBeDefined();
    expect(screen.getByText('Approve transfer on Arbitrum One')).toBeDefined();
    expect(screen.getByText('Approve transaction on Ethereum')).toBeDefined();
    expect(screen.getByText('Approve transfer on Ethereum')).toBeDefined();
    expect(screen.getByText('Funds arrive on Ethereum')).toBeDefined();
    expect(screen.queryByText('Wait ~15 minutes')).toBeNull();
  });

  it('does not complete the LiFi transfer step from an allowance-only process', () => {
    const { container } = render(
      <TransactionsTableDetailsSteps
        tx={withRouteHistory({
          ...baseLifiTransaction,
          lifiRoute: {
            steps: [
              {
                ...(baseLifiTransaction.lifiRoute?.steps[0] ?? {}),
                execution: {
                  status: 'DONE',
                  process: [
                    {
                      type: 'TOKEN_ALLOWANCE',
                      status: 'DONE',
                      txHash: '0xapproval',
                      startedAt: 1,
                    },
                  ],
                },
              },
            ],
          } as unknown as LifiMergedTransaction['lifiRoute'],
        })}
      />,
    );
    const renderedSteps = within(container);

    expect(
      renderedSteps.getByText('Approve transaction on Arbitrum One').previousElementSibling
        ?.tagName,
    ).toBe('svg');
    expect(
      renderedSteps.getByText('Approve transfer on Arbitrum One').previousElementSibling?.tagName,
    ).toBe('DIV');
  });

  it('ignores switch-chain processes when determining LiFi step state', () => {
    const { container } = render(
      <TransactionsTableDetailsSteps
        tx={withRouteHistory({
          ...baseLifiTransaction,
          lifiRoute: {
            steps: [
              {
                ...(baseLifiTransaction.lifiRoute?.steps[0] ?? {}),
                execution: {
                  status: 'DONE',
                  process: [{ type: 'SWITCH_CHAIN', status: 'DONE', startedAt: 1 }],
                },
              },
            ],
          } as unknown as LifiMergedTransaction['lifiRoute'],
        })}
      />,
    );
    const renderedSteps = within(container);

    expect(
      renderedSteps
        .getByText('Approve transaction on Arbitrum One')
        .previousElementSibling?.getAttribute('class'),
    ).toContain('border-white/50');
    expect(
      renderedSteps
        .getByText('Approve transfer on Arbitrum One')
        .previousElementSibling?.getAttribute('class'),
    ).toContain('border-white/50');
  });

  it('keeps a pending smart-wallet batch process pending when it has an id', () => {
    const { container } = render(
      <TransactionsTableDetailsSteps
        tx={withRouteHistory({
          ...baseLifiTransaction,
          lifiRoute: {
            steps: [
              {
                ...(baseLifiTransaction.lifiRoute?.steps[0] ?? {}),
                execution: {
                  status: 'PENDING',
                  process: [
                    {
                      type: 'CROSS_CHAIN',
                      status: 'PENDING',
                      txHash: 'wallet-batch-id',
                      txType: 'eip5792',
                      startedAt: 1,
                    },
                  ],
                },
              },
            ],
          } as unknown as LifiMergedTransaction['lifiRoute'],
        })}
      />,
    );

    const transferStep = within(container).getByText('Approve transfer on Arbitrum One');
    expect(transferStep.previousElementSibling?.tagName).toBe('DIV');
    expect(transferStep.previousElementSibling?.getAttribute('class')).toContain(
      'border-yellow-400',
    );
  });

  it('keeps a completed approval successful when a later transfer process fails', () => {
    const { container } = render(
      <TransactionsTableDetailsSteps
        tx={withRouteHistory({
          ...baseLifiTransaction,
          lifiRoute: {
            steps: [
              {
                ...(baseLifiTransaction.lifiRoute?.steps[0] ?? {}),
                execution: {
                  status: 'FAILED',
                  process: [
                    { type: 'TOKEN_ALLOWANCE', status: 'DONE', startedAt: 1 },
                    { type: 'CROSS_CHAIN', status: 'FAILED', startedAt: 2 },
                  ],
                },
              },
            ],
          } as unknown as LifiMergedTransaction['lifiRoute'],
        })}
      />,
    );

    const renderedSteps = within(container);
    const approvalStep = renderedSteps.getByText('Approve transaction on Arbitrum One');
    const transferStep = renderedSteps.getByText('Approve transfer on Arbitrum One');

    expect(approvalStep.previousElementSibling?.getAttribute('class')).toContain('text-green-400');
    expect(transferStep.previousElementSibling?.getAttribute('class')).toContain('text-red-400');
  });

  it('renders the final transaction steps after the resumable route is pruned', () => {
    const { container } = render(
      <TransactionsTableDetailsSteps
        tx={{
          ...baseLifiTransaction,
          destinationStatus: WithdrawalStatus.CONFIRMED,
          lifiRoute: undefined,
          lifiRouteSteps: [
            {
              id: 'bridge-step',
              fromChainId: ChainId.ArbitrumOne,
              displaySteps: [],
              execution: {
                process: [{ type: 'CROSS_CHAIN', status: 'DONE' }],
              },
            },
            {
              id: 'swap-step',
              fromChainId: ChainId.Ethereum,
              displaySteps: [],
              execution: {
                process: [{ type: 'SWAP', status: 'DONE' }],
              },
            },
          ] satisfies NonNullable<LifiMergedTransaction['lifiRouteSteps']>,
        }}
      />,
    );
    const renderedSteps = within(container);

    expect(renderedSteps.getByText('Approve transfer on Arbitrum One')).toBeDefined();
    expect(renderedSteps.getByText('Approve transfer on Ethereum')).toBeDefined();
    expect(renderedSteps.getByText('Funds arrive on Ethereum')).toBeDefined();
    expect(renderedSteps.queryByText('Wait ~15 minutes')).toBeNull();
  });

  it('uses the persisted history snapshot when resume pruning removes a failed process', () => {
    const { container } = render(
      <TransactionsTableDetailsSteps
        tx={{
          ...baseLifiTransaction,
          lifiRouteSteps: [
            {
              id: 'bridge-step',
              fromChainId: ChainId.ArbitrumOne,
              displaySteps: [],
              execution: {
                process: [
                  {
                    type: 'CROSS_CHAIN',
                    status: 'FAILED',
                    txHash: '0xfailed',
                    txLink: 'https://example.com/tx/failed',
                  },
                ],
              },
            },
          ] satisfies NonNullable<LifiMergedTransaction['lifiRouteSteps']>,
        }}
      />,
    );

    const transferStep = within(container).getByText('Approve transfer on Arbitrum One');
    expect(transferStep.previousElementSibling?.getAttribute('class')).toContain('text-red-400');
  });
});
