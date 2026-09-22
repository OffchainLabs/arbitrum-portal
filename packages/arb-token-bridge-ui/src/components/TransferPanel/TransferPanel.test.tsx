import type { RouteExtended } from '@lifi/sdk';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { zeroAddress } from 'viem';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { LifiCrosschainTransfersRoute } from '../../app/api/crosschain-transfers/lifi';
import { useLifiMergedTransactionCacheStore } from '../../hooks/useLifiMergedTransactionCacheStore';
import { defaultState } from '../../state/app/state';
import { createBridgeTestWrapper } from '../../test-utils/bridge-test-wrapper';
import { createMockLifiRoute } from '../../test-utils/lifi';
import { ChainId } from '../../types/ChainId';
import { defaultWalletContextValue } from '../../wallet/WalletContext';
import { SOLANA_NATIVE_TOKEN_ADDRESS } from '../../wallet/ecosystems/solana';
import type { WalletContextValue } from '../../wallet/types';
import { TransferPanel } from './TransferPanel';
import { useRouteStore } from './hooks/useRouteStore';

const evmAddress = '0x0000000000000000000000000000000000000001';
const solanaAddress = 'So11111111111111111111111111111111111111112';
const starter = vi.hoisted(() => ({
  requiresNativeCurrencyApproval: vi.fn(),
  transfer: vi.fn(),
}));
const signer = vi.hoisted(() => ({ getAddress: async () => evmAddress }));

vi.mock('@sentry/react', async (actual) => ({
  ...(await actual<typeof import('@sentry/react')>()),
  captureException: vi.fn(),
}));
vi.mock('../../util/AccountUtils', () => ({
  getAccountType: async () => 'externally-owned-account',
}));
vi.mock('../../util/wagmi/useEthersSigner', () => ({ useEthersSigner: () => signer }));
vi.mock('../../token-bridge-sdk/BridgeTransferStarterFactory', () => ({
  BridgeTransferStarterFactory: { create: () => starter },
}));
vi.mock('../../util/featureFlag', async (actual) => ({
  ...(await actual<typeof import('../../util/featureFlag')>()),
  isLifiEnabled: () => true,
}));
vi.mock('../../wallet/ecosystems/solana', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../wallet/ecosystems/solana')>();
  actual.solanaEcosystem.isEnabled = () => true;
  return actual;
});
vi.mock('./hooks/useIsTransferAllowed', () => ({ useIsTransferAllowed: () => true }));
vi.mock('./MoveFundsButton', () => ({
  MoveFundsButton: ({ onClick }: { onClick: () => void }) => (
    <button onClick={onClick}>Move funds</button>
  ),
}));
vi.mock('./TransferPanelMain', () => ({ TransferPanelMain: () => null }));
vi.mock('./ReceiveFundsHeader', () => ({ ReceiveFundsHeader: () => null }));
vi.mock('./Routes/Routes', () => ({ Routes: () => null }));
vi.mock('./ToSConfirmationCheckbox', () => ({ ToSConfirmationCheckbox: () => null }));
vi.mock('./ConnectWalletButton', () => ({ ConnectWalletButton: () => null }));

const wallets: WalletContextValue = {
  evm: {
    ecosystem: 'evm',
    isConnected: true,
    disconnect: async () => {},
    account: { ecosystem: 'evm', address: evmAddress, chainId: 1, status: 'connected' },
    signer: defaultWalletContextValue.evm.signer,
  },
  solana: {
    ecosystem: 'solana',
    isConnected: false,
    disconnect: async () => {},
    account: { ecosystem: 'solana', status: 'disconnected' },
    signer: defaultWalletContextValue.solana.signer,
  },
};

function renderPanel({
  sourceChain = ChainId.Ethereum,
  connectedWallets = wallets,
}: { sourceChain?: ChainId; connectedWallets?: WalletContextValue } = {}) {
  return render(<TransferPanel />, {
    wrapper: createBridgeTestWrapper({
      query: { sourceChain, destinationChain: ChainId.ArbitrumOne, amount: '1' },
      wallets: connectedWallets,
      app: {
        arbTokenBridgeLoaded: true,
        arbTokenBridge: { ...defaultState.arbTokenBridge, bridgeTokens: {} },
      },
    }),
  });
}

function lifiQuote(fromAmount: string): LifiCrosschainTransfersRoute {
  const eth = { address: zeroAddress, symbol: 'ETH', decimals: 18, name: 'Ether', priceUSD: '1' };
  const step = {
    action: {
      fromChainId: ChainId.Ethereum,
      toChainId: ChainId.ArbitrumOne,
      fromAmount,
      fromToken: { ...eth, chainId: ChainId.Ethereum },
      toToken: { ...eth, chainId: ChainId.ArbitrumOne },
      fromAddress: evmAddress,
      toAddress: evmAddress,
    },
    estimate: { toAmount: fromAmount },
  } as unknown as RouteExtended['steps'][number];
  const amount = { amount: fromAmount, amountUSD: '1', token: { ...eth, logoURI: '' } };
  return {
    type: 'lifi',
    durationMs: 0,
    gas: [],
    fee: [],
    fromAmount: amount,
    toAmount: amount,
    fromChainId: ChainId.Ethereum,
    toChainId: ChainId.ArbitrumOne,
    fromAddress: evmAddress,
    toAddress: evmAddress,
    protocolData: { route: createMockLifiRoute({ steps: [step] }) },
  };
}

afterEach(cleanup);
beforeEach(() => {
  vi.clearAllMocks();
  useRouteStore.setState({ selectedRoute: 'arbitrum' });
  starter.transfer.mockRejectedValue(new Error('transfer failed'));
});

describe.sequential('TransferPanel LiFi submission', () => {
  it('records a native SOL transfer in the LiFi history', async () => {
    const solanaWallets: WalletContextValue = {
      ...wallets,
      solana: {
        ecosystem: 'solana',
        isConnected: true,
        disconnect: async () => {},
        account: {
          ecosystem: 'solana',
          address: solanaAddress,
          chainId: ChainId.Solana,
          status: 'connected',
        },
        signer: defaultWalletContextValue.solana.signer,
      },
    };
    const quote = lifiQuote('1000000000');
    const [step] = quote.protocolData.route.steps;
    if (!step) throw new Error('Missing step');
    const sol = { address: SOLANA_NATIVE_TOKEN_ADDRESS, symbol: 'SOL', decimals: 9 };
    Object.assign(step.action, {
      fromChainId: ChainId.Solana,
      fromToken: { ...step.action.fromToken, ...sol, chainId: ChainId.Solana },
      fromAddress: solanaAddress,
    });
    Object.assign(quote, {
      fromChainId: ChainId.Solana,
      fromAddress: solanaAddress,
      fromAmount: { ...quote.fromAmount, token: { ...quote.fromAmount.token, ...sol } },
    });
    const txHash = '5'.repeat(88);
    starter.transfer.mockImplementationOnce(async ({ onRouteUpdate }) => {
      const steps = [
        { ...step, execution: { status: 'PENDING', process: [{ type: 'CROSS_CHAIN', txHash }] } },
      ];
      onRouteUpdate({ ...quote.protocolData.route, steps });
      return { sourceChainTransaction: { hash: txHash, wait: async () => {} } };
    });
    useRouteStore.setState({ selectedRoute: 'lifi', routes: [{ type: 'lifi', route: quote }] });
    renderPanel({ sourceChain: ChainId.Solana, connectedWallets: solanaWallets });

    fireEvent.click(screen.getByText('Move funds'));

    await waitFor(() =>
      expect(
        useLifiMergedTransactionCacheStore.getState().transactions[solanaAddress],
      ).toContainEqual(
        expect.objectContaining({
          txId: txHash,
          asset: 'SOL',
          tokenAddress: SOLANA_NATIVE_TOKEN_ADDRESS,
          sender: solanaAddress,
          destination: evmAddress,
        }),
      ),
    );
  });
});
