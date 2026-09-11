import { cleanup, render, screen, within } from '@testing-library/react';
import { constants, utils } from 'ethers';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AssetType } from '../../hooks/arbTokenBridge.types';
import { LifiMergedTransaction, WithdrawalStatus } from '../../state/app/state';
import { createMockLifiBatchedTransaction, createMockLifiTransaction } from '../../test-utils/lifi';
import { ChainId } from '../../types/ChainId';
import { getLifiRouteHistorySteps } from '../../util/LifiRouteUtils';
import { rejectLifiRouteBatchId, resolveLifiRouteBatchId } from '../../util/LifiTransactionStatus';
import {
  TransactionFailedOnNetwork,
  TransactionsTableDetailsSteps,
} from './TransactionsTableDetailsSteps';

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
  address: '0xaf88d065e77c8cc2239327c5edb3a432268e5831',
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

const baseLifiTransaction: LifiMergedTransaction = createMockLifiTransaction({
  txId: '0xsource',
  asset: 'USDC',
  status: WithdrawalStatus.CONFIRMED,
  value: '100',
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

describe.sequential('TransactionsTableDetailsSteps', () => {
  it.each(['DONE', 'FAILED', 'PENDING'] as const)(
    'keeps later %s steps grey until the preceding approval finishes',
    (status) => {
      const tx = createMockLifiBatchedTransaction();
      const destinationStep = tx.lifiRoute?.steps[1];
      if (!destinationStep) throw new Error('Expected destination step');
      destinationStep.execution = {
        startedAt: 1,
        status: 'ACTION_REQUIRED',
        process: [
          { type: 'TOKEN_ALLOWANCE', status: 'ACTION_REQUIRED', startedAt: 1 },
          { type: 'SWAP', status, startedAt: 1 },
        ],
      };
      tx.destinationStatus =
        status === 'DONE'
          ? WithdrawalStatus.CONFIRMED
          : status === 'FAILED'
            ? WithdrawalStatus.FAILURE
            : WithdrawalStatus.UNCONFIRMED;
      const { rerender } = render(<TransactionsTableDetailsSteps tx={tx} />);
      for (const label of [
        'Approve transfer on Robinhood Chain',
        'Funds arrive on Robinhood Chain',
      ]) {
        expect(screen.getByText(label).previousElementSibling?.getAttribute('class')).toContain(
          'border-white/50',
        );
      }
      for (const approvalStatus of ['DONE', 'FAILED'] as const) {
        const approval = destinationStep.execution.process[0];
        if (!approval) throw new Error('Expected approval process');
        approval.status = approvalStatus;
        approval.txHash = `0x${'4'.repeat(64)}`;
        rerender(<TransactionsTableDetailsSteps tx={{ ...tx }} />);
        expect(
          screen
            .getByText('Approve transfer on Robinhood Chain')
            .previousElementSibling?.getAttribute('class'),
        ).toContain(
          status === 'DONE'
            ? 'text-green-400'
            : status === 'FAILED'
              ? 'text-red-400'
              : 'border-yellow-400',
        );
      }
    },
  );

  it.each(['live', 'saved', 'legacy saved'] as const)(
    'omits native-token approvals per step in %s history',
    (history) => {
      const tx = createMockLifiBatchedTransaction();
      const route = tx.lifiRoute;
      if (!route || !route.steps[0]) {
        throw new Error('Expected a route with a source step');
      }
      const sourceStep = route.steps[0];
      sourceStep.action.fromToken = {
        ...sourceStep.action.fromToken,
        address: constants.AddressZero,
        symbol: 'ETH',
        decimals: 18,
      };
      if (history === 'saved') {
        tx.lifiRouteSteps = getLifiRouteHistorySteps(route);
        delete tx.lifiRoute;
      } else if (history === 'legacy saved') {
        tx.lifiRouteSteps = getLifiRouteHistorySteps(route);
        tx.lifiRouteSteps.forEach((step) => delete step.requiresApproval);
      }
      const { rerender } = render(<TransactionsTableDetailsSteps tx={tx} />);
      expect(screen.queryByText('Approve transaction on Arbitrum One')).toBeNull();
      expect(screen.getByText('Approve transfer on Arbitrum One')).toBeDefined();
      expect(screen.getByText('Approve transaction on Robinhood Chain')).toBeDefined();

      for (const step of route.steps) {
        step.action.fromToken = { ...step.action.fromToken, address: constants.AddressZero };
        step.execution = {
          startedAt: 1,
          status: 'DONE',
          process: [{ type: 'SWAP', status: 'DONE', startedAt: 1 }],
        };
      }
      rerender(
        <TransactionsTableDetailsSteps
          tx={{ ...tx, lifiRouteSteps: getLifiRouteHistorySteps(route) }}
        />,
      );
      expect(screen.queryByText(/Approve transaction on/)).toBeNull();
      expect(
        screen
          .getByText('Funds arrive on Robinhood Chain')
          .previousElementSibling?.getAttribute('class'),
      ).toContain('border-yellow-400');
    },
  );

  it('keeps arrival neutral while destination approvals are still ahead', () => {
    render(<TransactionsTableDetailsSteps tx={baseLifiTransaction} />);
    expect(
      screen.getByText('Funds arrive on Ethereum').previousElementSibling?.getAttribute('class'),
    ).toContain('border-white/50');
  });

  it('links arrival to LiFi Scan while only the source transaction exists', () => {
    const tx = createMockLifiBatchedTransaction();
    render(<TransactionsTableDetailsSteps tx={tx} />);
    const arrivalRow = screen.getByText('Funds arrive on Robinhood Chain').parentElement
      ?.parentElement;
    expect(arrivalRow?.querySelector('a')?.getAttribute('href')).toBe(
      `https://scan.li.fi/tx/${tx.txId}`,
    );
  });

  it('waits for wallet confirmation before completing a prepared batch allowance', () => {
    const tx = createMockLifiBatchedTransaction();
    render(<TransactionsTableDetailsSteps tx={tx} />);
    expect(
      screen
        .getByText('Approve transaction on Robinhood Chain')
        .previousElementSibling?.getAttribute('class'),
    ).toContain('border-yellow-400');
  });

  it.each(['confirmed', 'rejected'] as const)(
    'updates the destination batch approval only after the wallet has %s it',
    (outcome) => {
      const tx = createMockLifiBatchedTransaction();
      if (!tx.lifiRoute) throw new Error('Expected a saved route');
      const { rerender } = render(<TransactionsTableDetailsSteps tx={tx} />);
      expect(
        screen
          .getByText('Approve transaction on Robinhood Chain')
          .previousElementSibling?.getAttribute('class'),
      ).toContain('border-yellow-400');
      const batchId = `0x${'3'.repeat(64)}`;
      const lifiRoute =
        outcome === 'confirmed'
          ? resolveLifiRouteBatchId({
              route: tx.lifiRoute,
              batchId,
              txHash: `0x${'4'.repeat(64)}`,
              txLink: `https://explorer.robinhood.com/tx/0x${'4'.repeat(64)}`,
            })
          : rejectLifiRouteBatchId({ route: tx.lifiRoute, batchId });
      rerender(<TransactionsTableDetailsSteps tx={{ ...tx, lifiRoute }} />);
      expect(
        screen
          .getByText('Approve transaction on Robinhood Chain')
          .previousElementSibling?.getAttribute('class'),
      ).toContain(outcome === 'confirmed' ? 'text-green-400' : 'text-red-400');
    },
  );

  it('marks arrival pending once it is the next unfinished step', () => {
    const tx = createMockLifiBatchedTransaction();
    if (!tx.lifiRoute) throw new Error('Expected a saved route');
    for (const step of tx.lifiRoute.steps) {
      if (step.execution) {
        step.execution.status = 'DONE';
        step.execution.process.forEach((process) => {
          process.status = 'DONE';
        });
      }
    }
    render(<TransactionsTableDetailsSteps tx={tx} />);
    expect(
      screen
        .getByText('Funds arrive on Robinhood Chain')
        .previousElementSibling?.getAttribute('class'),
    ).toContain('border-yellow-400');
  });
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
        tx={{
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
        }}
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
        tx={{
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
        }}
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

  it('keeps a smart-wallet batch transfer grey while its approval is pending', () => {
    const { container } = render(
      <TransactionsTableDetailsSteps
        tx={{
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
        }}
      />,
    );

    const transferStep = within(container).getByText('Approve transfer on Arbitrum One');
    expect(transferStep.previousElementSibling?.tagName).toBe('DIV');
    expect(transferStep.previousElementSibling?.getAttribute('class')).toContain('border-white/50');
  });

  it('keeps a completed approval successful when a later transfer process fails', () => {
    const { container } = render(
      <TransactionsTableDetailsSteps
        tx={{
          ...baseLifiTransaction,
          lifiRoute: {
            steps: [
              {
                ...(baseLifiTransaction.lifiRoute?.steps[0] ?? {}),
                execution: {
                  status: 'FAILED',
                  process: [
                    {
                      type: 'TOKEN_ALLOWANCE',
                      status: 'DONE',
                      startedAt: 1,
                      txHash: `0x${'5'.repeat(64)}`,
                    },
                    { type: 'CROSS_CHAIN', status: 'FAILED', startedAt: 2 },
                  ],
                },
              },
            ],
          } as unknown as LifiMergedTransaction['lifiRoute'],
        }}
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

const sender = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd';

describe('TransactionFailedOnNetwork', () => {
  it('offers settlement after 7 days for a native transfer to the sender without refund metadata', () => {
    const html = renderToStaticMarkup(
      <TransactionFailedOnNetwork
        networkName="Robinhood Chain"
        tx={{ assetType: AssetType.ETH, sender, destination: sender.toUpperCase() }}
      />,
    );

    expect(html).toContain(
      'You can retry now or wait for your funds to settle successfully on Robinhood Chain 7 days after your initial transaction.',
    );
    expect(html).not.toContain('lost forever');
  });

  it.each([
    { assetType: AssetType.ERC20, sender, destination: sender },
    { assetType: AssetType.ETH, sender, destination: '0x1111111111111111111111111111111111111111' },
    { assetType: AssetType.ETH, sender, destination: undefined },
    { assetType: AssetType.ETH, sender: undefined, destination: undefined },
  ])(
    'keeps the retry warning for $assetType with sender $sender and destination $destination',
    (tx) => {
      const html = renderToStaticMarkup(
        <TransactionFailedOnNetwork networkName="Robinhood Chain" tx={tx} />,
      );

      expect(html).toContain('lost forever');
      expect(html).not.toContain('settle successfully');
    },
  );
});
