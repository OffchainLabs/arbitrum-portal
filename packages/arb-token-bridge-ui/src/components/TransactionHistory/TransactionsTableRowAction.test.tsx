import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { Address } from 'viem';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AssetType } from '../../hooks/arbTokenBridge.types';
import { DepositStatus, WithdrawalStatus } from '../../state/app/state';
import type { LifiMergedTransaction } from '../../state/app/state';
import { createMockLifiRoute } from '../../test-utils/lifi';
import { TransactionsTableRowAction } from './TransactionsTableRowAction';

const mocks = vi.hoisted(() => ({
  useAccount: vi.fn(),
  useConfig: vi.fn(),
  resumeLifiRoute: vi.fn(),
  updatePendingTransaction: vi.fn(),
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

vi.mock('../common/Dialog2', () => ({
  DialogWrapper: () => null,
  useDialog2: () => [{ openedDialogType: null, onClose: vi.fn() }, vi.fn()],
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

const baseLifiTransaction: LifiMergedTransaction = {
  txId: '0xsource',
  asset: 'ETH',
  assetType: AssetType.ETH,
  blockNum: null,
  createdAt: 1_700_000_000_000,
  direction: 'deposit',
  isWithdrawal: false,
  resolvedAt: null,
  status: WithdrawalStatus.CONFIRMED,
  destinationStatus: WithdrawalStatus.UNCONFIRMED,
  uniqueId: null,
  value: '1',
  depositStatus: DepositStatus.LIFI_DEFAULT_STATE,
  destination: '0x1111111111111111111111111111111111111111',
  sender: '0x1111111111111111111111111111111111111111',
  isLifi: true,
  tokenAddress: token.address,
  parentChainId: 1,
  childChainId: 42161,
  sourceChainId: 1,
  destinationChainId: 42161,
  toolsDetails: [{ key: 'across', name: 'Across', logoURI: '' }],
  durationMs: 0,
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
  destinationTxId: null,
  lifiRoute: {
    steps: [{}, {}],
  } as LifiMergedTransaction['lifiRoute'],
};

function renderAction(tx: LifiMergedTransaction = baseLifiTransaction) {
  cleanup();
  render(
    <TransactionsTableRowAction
      tx={tx}
      type="deposits"
      updatePendingTransaction={mocks.updatePendingTransaction}
    />,
  );
}

describe('TransactionsTableRowAction', () => {
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
      expect(mocks.updatePendingTransaction).toHaveBeenCalledWith({
        ...baseLifiTransaction,
        lifiRoute: updatedRoute,
        lifiRouteSteps: [],
      });
      expect(mocks.updateLifiTransactionInCache).not.toHaveBeenCalled();
    });
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
      expect(mocks.updatePendingTransaction).toHaveBeenCalledWith({
        ...settledTransaction,
        lifiRoute: updatedRoute,
        lifiRouteSteps: [],
      });
      expect(mocks.updateLifiTransactionInCache).not.toHaveBeenCalled();
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
      expect(mocks.updatePendingTransaction).toHaveBeenLastCalledWith({
        ...failedTransaction,
        lifiRoute: completedRoute,
        lifiRouteSteps: [],
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
