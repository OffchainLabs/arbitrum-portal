import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import type { Address } from 'viem';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WithdrawalStatus } from '../../state/app/state';
import type { LifiMergedTransaction } from '../../state/app/state';
import {
  createMockLifiBatchedTransaction,
  createMockLifiRoute,
  createMockLifiTransaction,
} from '../../test-utils/lifi';
import { rejectLifiRouteBatchId } from '../../util/LifiTransactionStatus';
import type { DialogProps } from '../common/Dialog2';
import { TransactionsTableDetailsSteps } from './TransactionsTableDetailsSteps';
import { TransactionsTableRowAction } from './TransactionsTableRowAction';

vi.mock('../../hooks/useTransferDuration', () => ({
  useTransferDuration: () => ({ approximateDurationInMinutes: 1 }),
  minutesToHumanReadableTime: () => '1 minute',
}));

const mocks = vi.hoisted(() => ({
  useAccount: vi.fn(),
  useConfig: vi.fn(),
  resumeLifiRoute: vi.fn(),
  updateTransaction: vi.fn(),
  updateLifiTransactionInCache: vi.fn(),
}));

vi.mock('wagmi', () => ({
  useAccount: mocks.useAccount,
  useConfig: mocks.useConfig,
}));

vi.mock('@/token-bridge-sdk/LifiTransferStarter', () => ({
  LifiTransferStarter: vi.fn(),
}));

vi.mock('@/token-bridge-sdk/LifiRouteExecutor', () => ({
  resumeLifiRoute: mocks.resumeLifiRoute,
}));

vi.mock('@/token-bridge-sdk/utils', () => ({
  getProviderForChainId: vi.fn(),
}));

vi.mock('../../hooks/useClaimWithdrawal', () => ({
  useClaimWithdrawal: () => ({
    claim: vi.fn(),
    isClaiming: false,
  }),
}));

vi.mock('../../hooks/useLifiMergedTransactionCacheStore', () => ({
  useLifiMergedTransactionCacheStore: (selector: (state: unknown) => unknown) =>
    selector({ updateTransaction: mocks.updateLifiTransactionInCache }),
}));

vi.mock('../../hooks/useRedeemRetryable', () => ({
  useRedeemRetryable: () => ({
    redeem: vi.fn(),
    isRedeeming: false,
  }),
}));

vi.mock('../../hooks/useSwitchNetworkWithConfig', () => ({
  useSwitchNetworkWithConfig: () => ({
    switchChainAsync: vi.fn(),
  }),
}));

vi.mock('../common/Dialog2', async (importActual) => ({
  ...(await importActual<typeof import('../common/Dialog2')>()),
  DialogWrapper: ({ openedDialogType, onClose }: DialogProps) =>
    openedDialogType ? (
      <div role="dialog">
        <button onClick={() => onClose(true)}>Approve token</button>
      </div>
    ) : null,
}));

vi.mock('../common/TransferCountdown', () => ({
  TransferCountdown: () => <span>Countdown</span>,
}));

vi.mock('../../state/app/utils', async (importActual) => ({
  ...(await importActual<typeof import('../../state/app/utils')>()),
  isDepositReadyToRedeem: () => false,
}));

vi.mock('../../state/cctpState', async (importActual) => ({
  ...(await importActual<typeof import('../../state/cctpState')>()),
  useClaimCctp: () => ({
    claim: vi.fn(),
    isClaiming: false,
  }),
}));

vi.mock('../../wallet/hooks/useWalletModal', () => ({
  useWalletModal: () => ({
    openConnectModal: vi.fn(),
  }),
}));

const token = {
  address: '0x0000000000000000000000000000000000000000',
  decimals: 18,
  logoURI: '',
  symbol: 'ETH',
};

const baseLifiTransaction: LifiMergedTransaction = createMockLifiTransaction({
  txId: '0xsource',
  status: WithdrawalStatus.CONFIRMED,
  fromAmount: {
    amount: '1000000000000000000',
    amountUSD: '1',
    token,
  },
  toAmount: {
    amount: '1000000000000000000',
    amountUSD: '1',
    token,
  },
  lifiRoute: {
    steps: [{}, {}],
  } as LifiMergedTransaction['lifiRoute'],
});

function renderAction(tx: LifiMergedTransaction = baseLifiTransaction) {
  cleanup();
  render(
    <TransactionsTableRowAction
      tx={tx}
      type="deposits"
      updateTransaction={mocks.updateTransaction}
    />,
  );
}

describe.sequential('TransactionsTableRowAction', () => {
  afterEach(cleanup);

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useAccount.mockReturnValue({
      address: '0x1111111111111111111111111111111111111111' as Address,
      chain: { id: 1 },
      isConnected: true,
    });
    mocks.useConfig.mockReturnValue({});
  });

  it('shows resume for a multi-step LiFi transaction confirmed on source and pending on destination', () => {
    renderAction();

    const resumeButton = screen.getByRole('button', {
      name: 'Resume LiFi transaction',
    });

    expect(resumeButton.textContent).toBe('Resume');
  });

  it('updates only the route while resuming', async () => {
    const updatedRoute = { id: 'updated-route', steps: [{}, {}] };
    mocks.resumeLifiRoute.mockImplementation(async (_route, options) => {
      options.onRouteUpdate(updatedRoute);
      return updatedRoute;
    });
    renderAction();

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Resume LiFi transaction',
      }),
    );

    await waitFor(() => {
      expect(mocks.updateTransaction).toHaveBeenCalledWith({
        ...baseLifiTransaction,
        lifiRoute: updatedRoute,
      });
      expect(mocks.updateLifiTransactionInCache).not.toHaveBeenCalled();
    });
  });

  it('keeps the approval dialog available after a resumed route becomes active', async () => {
    const activeRoute = structuredClone(baseLifiTransaction.lifiRoute);
    const firstStep = activeRoute?.steps[0];
    if (!firstStep) {
      throw new Error('Expected a saved route');
    }
    firstStep.execution = {
      startedAt: 0,
      status: 'ACTION_REQUIRED',
      process: [{ type: 'TOKEN_ALLOWANCE', status: 'ACTION_REQUIRED', startedAt: 0 }],
    };
    const approvalAccepted = vi.fn();
    mocks.resumeLifiRoute.mockImplementation(async (_route, options) => {
      options.onRouteUpdate(activeRoute);
      approvalAccepted(await options.onApprovalRequest({}));
      return activeRoute;
    });

    function ActionWithHistory() {
      const [transaction, setTransaction] = useState(baseLifiTransaction);
      return (
        <TransactionsTableRowAction
          tx={transaction}
          type="deposits"
          updateTransaction={(updatedTransaction) => {
            if (updatedTransaction.isLifi) {
              setTransaction(updatedTransaction);
            }
          }}
        />
      );
    }
    render(<ActionWithHistory />);
    fireEvent.click(screen.getByRole('button', { name: 'Resume LiFi transaction' }));

    fireEvent.click(await screen.findByRole('button', { name: 'Approve token' }));
    await waitFor(() => expect(approvalAccepted).toHaveBeenCalledWith(true));
  });

  it('keeps a settled route settled while execution resumes', async () => {
    const settledTransaction = {
      ...baseLifiTransaction,
      destinationStatus: WithdrawalStatus.CONFIRMED,
    };
    const updatedRoute = { id: 'retried-route', steps: [{}, {}] };
    mocks.resumeLifiRoute.mockImplementation(async (_route, options) => {
      options.onRouteUpdate(updatedRoute);
      return updatedRoute;
    });
    renderAction(settledTransaction);

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Resume LiFi transaction',
      }),
    );

    await waitFor(() => {
      expect(mocks.updateTransaction).toHaveBeenCalledWith({
        ...settledTransaction,
        lifiRoute: updatedRoute,
      });
      expect(mocks.updateLifiTransactionInCache).not.toHaveBeenCalled();
    });
  });

  it('turns the arrival row grey while the resumed destination batch awaits approval', async () => {
    const activeTransaction = createMockLifiBatchedTransaction();
    const activeRoute = activeTransaction.lifiRoute;
    if (!activeRoute) throw new Error('Expected a saved route');
    const failedTransaction = {
      ...activeTransaction,
      destinationStatus: WithdrawalStatus.FAILURE,
      lifiRoute: rejectLifiRouteBatchId({ route: activeRoute, batchId: `0x${'3'.repeat(64)}` }),
    };
    mocks.resumeLifiRoute.mockImplementation(async (_route, options) => {
      options.onRouteUpdate(activeRoute);
      return activeRoute;
    });
    function History() {
      const [transaction, setTransaction] = useState<LifiMergedTransaction>(failedTransaction);
      return (
        <>
          <TransactionsTableRowAction
            tx={transaction}
            type="deposits"
            updateTransaction={(updated) => {
              mocks.updateTransaction(updated);
              if (updated.isLifi) setTransaction(updated);
            }}
          />
          <TransactionsTableDetailsSteps tx={transaction} />
        </>
      );
    }
    render(<History />);
    expect(
      screen
        .getByText('Funds arrive on Robinhood Chain')
        .previousElementSibling?.getAttribute('class'),
    ).toContain('text-red-400');
    fireEvent.click(screen.getByRole('button', { name: 'Resume LiFi transaction' }));
    await waitFor(() => {
      expect(mocks.updateTransaction).toHaveBeenLastCalledWith(
        expect.objectContaining({ destinationStatus: WithdrawalStatus.UNCONFIRMED }),
      );
      expect(
        screen
          .getByText('Funds arrive on Robinhood Chain')
          .previousElementSibling?.getAttribute('class'),
      ).toContain('border-white/50');
    });
  });

  it('clears a stale failure status when the resumed route completes', async () => {
    const failedRoute = createMockLifiRoute({ id: 'failed-route' });
    failedRoute.steps = structuredClone(baseLifiTransaction.lifiRoute?.steps ?? []);
    const [completedStep, failedStep] = failedRoute.steps;
    if (!completedStep || !failedStep) {
      throw new Error('Expected a two-step LiFi route');
    }
    completedStep.execution = { startedAt: 0, status: 'DONE', process: [] };
    failedStep.execution = { startedAt: 0, status: 'FAILED', process: [] };

    const failedTransaction = {
      ...baseLifiTransaction,
      destinationStatus: WithdrawalStatus.FAILURE,
      lifiRoute: failedRoute,
    };
    const completedRoute = structuredClone(failedRoute);
    completedRoute.id = 'completed-route';
    completedRoute.steps.forEach((step) => {
      step.execution = { startedAt: 0, status: 'DONE', process: [] };
    });
    mocks.resumeLifiRoute.mockImplementation(async (_route, options) => {
      options.onRouteUpdate(completedRoute);
      return completedRoute;
    });
    renderAction(failedTransaction);

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Resume LiFi transaction',
      }),
    );

    await waitFor(() => {
      expect(mocks.updateTransaction).toHaveBeenLastCalledWith({
        ...failedTransaction,
        lifiRoute: completedRoute,
        status: WithdrawalStatus.CONFIRMED,
        destinationStatus: WithdrawalStatus.CONFIRMED,
      });
      expect(mocks.updateLifiTransactionInCache).not.toHaveBeenCalled();
    });
  });

  it('does not show resume when the connected wallet is not the LiFi sender', () => {
    mocks.useAccount.mockReturnValue({
      address: '0x2222222222222222222222222222222222222222' as Address,
      chain: { id: 1 },
      isConnected: true,
    });

    renderAction();

    expect(
      screen.queryByRole('button', {
        name: 'Resume LiFi transaction',
      }),
    ).toBeNull();
  });

  it('renders legacy LiFi transactions without a saved route as pending, not resumable', () => {
    renderAction({
      ...baseLifiTransaction,
      lifiRoute: undefined,
    });

    expect(
      screen.queryByRole('button', {
        name: 'Resume LiFi transaction',
      }),
    ).toBeNull();
    expect(screen.getByText('Time left:')).toBeDefined();
    expect(screen.getByText('Countdown')).toBeDefined();
  });
});
