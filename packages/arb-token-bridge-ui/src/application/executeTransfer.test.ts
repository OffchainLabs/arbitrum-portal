import { BigNumber } from 'ethers';
import { arbitrum, mainnet } from 'viem/chains';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  type TransferCallbacks,
  type TransferSubmission,
  executeTransfer,
} from './executeTransfer';

const execution = vi.hoisted(() => ({
  transfer: vi.fn(),
  checkAccount: vi.fn(async () => {}),
  wait: vi.fn(async () => {}),
}));
vi.mock('./evmExecutionRuntime', () => ({
  switchEvmTransferNetwork: vi.fn(),
  getEvmExecutionRuntime: async () => ({
    signer: { getAddress: async () => '0x0000000000000000000000000000000000000001' },
    wagmiConfig: {},
    sourceChainProvider: {},
    destinationChainProvider: {},
    assertSigningAccount: execution.checkAccount,
  }),
}));
vi.mock('../token-bridge-sdk/BridgeTransferStarterFactory', () => ({
  BridgeTransferStarterFactory: {
    create: () => ({
      requiresNativeCurrencyApproval: async () => false,
      transfer: execution.transfer,
    }),
  },
}));
vi.mock('../components/TransactionHistory/TransactionHistoryDisclaimer', () => ({
  highlightTransactionHistoryDisclaimer: vi.fn(),
}));
vi.mock('../services/history', () => ({ addDepositToCache: vi.fn() }));
vi.mock('../components/TransferPanel/bridgeSdkConversionUtils', () => ({
  convertBridgeSdkToMergedTransaction: ({
    walletAddress,
    destinationAddress,
    amount,
  }: {
    walletAddress: string;
    destinationAddress: string;
    amount: BigNumber;
  }) => ({ sender: walletAddress, destination: destinationAddress, value: amount.toString() }),
  convertBridgeSdkToPendingDepositTransaction: vi.fn(),
}));
vi.mock('../components/TransferPanel/useTransferReadiness', () => ({ getAmountToPay: vi.fn() }));
vi.mock('../util/AnalyticsUtils', () => ({ trackEvent: vi.fn(), getLifiAssetType: vi.fn() }));
const sender = '0x0000000000000000000000000000000000000001';
const recipient = '0x0000000000000000000000000000000000000002';
function snapshot(): TransferSubmission {
  return {
    networks: { sourceChain: mainnet, destinationChain: arbitrum },
    parentChain: mainnet,
    childChain: arbitrum,
    walletAddress: sender,
    destinationWalletAddress: sender,
    destinationAddress: recipient,
    selectedToken: null,
    amount: '1',
    amount2: '',
    amountBigNumber: BigNumber.from(1),
    selectedRoute: 'arbitrum',
    context: undefined,
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18, isCustom: false },
    nativeCurrencyDecimalsOnSourceChain: 18,
    warningTokens: {},
    isDepositMode: true,
    isSmartContractWallet: false,
    isBatchTransferSupported: false,
    isSwapTransfer: false,
    isTransferAllowed: true,
  };
}
function callbacks(): TransferCallbacks {
  return {
    setTransferring: vi.fn(),
    confirmDialog: vi.fn(async () => true),
    confirmCustomDestinationAddress: vi.fn(async () => true),
    firstTimeTokenBridgingConfirmation: vi.fn(async () => true),
    confirmWithdrawal: vi.fn(async () => true),
    showDelayedSmartContractTxRequest: vi.fn(),
    showDelayInSmartContractTransaction: vi.fn(),
    handleError: vi.fn(),
    addPendingTransaction: vi.fn(),
    updatePendingTransaction: vi.fn(),
    addLifiTransactionToCache: vi.fn(),
    updateLifiTransactionInCache: vi.fn(),
    removeLifiTransactionFromCache: vi.fn(),
    resetAmountAndSwitchToTransactionHistoryTab: vi.fn(),
    clearRoute: vi.fn(),
    onSubmitted: vi.fn(),
    refreshTokenBalances: vi.fn(async () => {}),
  };
}
beforeEach(() => {
  vi.clearAllMocks();
  execution.checkAccount.mockResolvedValue();
  execution.transfer.mockImplementation(async () => ({
    sourceChainTransaction: { hash: '0x123', wait: execution.wait },
    transferType: 'eth_deposit',
  }));
});
describe.sequential('application execution snapshot', () => {
  it('uses captured history and balance accounts while waiting for the submitted receipt', async () => {
    let finish = () => {};
    const receipt = new Promise<void>((resolve) => {
      finish = resolve;
    });
    execution.wait.mockReturnValueOnce(receipt);
    const submitted = snapshot();
    const effects = callbacks();
    const completion = executeTransfer(submitted, effects);
    await vi.waitFor(() => expect(effects.onSubmitted).toHaveBeenCalledOnce());
    submitted.destinationAddress = '0x0000000000000000000000000000000000000003';
    submitted.walletAddress = submitted.destinationAddress;
    submitted.amount = '2';
    submitted.networks = { sourceChain: arbitrum, destinationChain: mainnet };
    finish();
    await completion;
    expect(effects.addPendingTransaction).toHaveBeenCalledWith({
      sender,
      destination: recipient,
      value: '1',
    });
    expect(effects.refreshTokenBalances).toHaveBeenCalledWith({
      chainId: 1,
      walletAddress: sender,
    });
    expect(effects.refreshTokenBalances).toHaveBeenCalledWith({
      chainId: 42161,
      walletAddress: recipient,
    });
  });
  it('rechecks the signing account after confirmation before submitting', async () => {
    const effects = callbacks();
    const changed = new Error('signing account changed');
    execution.checkAccount.mockRejectedValueOnce(changed);
    await executeTransfer(snapshot(), effects);
    expect(execution.transfer).not.toHaveBeenCalled();
    expect(effects.handleError).toHaveBeenCalledWith(expect.objectContaining({ error: changed }));
    expect(effects.addPendingTransaction).not.toHaveBeenCalled();
  });
  it('reports a receipt failure after preserving the early history record', async () => {
    const effects = callbacks();
    const timeout = new Error('receipt timeout');
    execution.wait.mockRejectedValueOnce(timeout);
    await executeTransfer(snapshot(), effects);
    expect(effects.addPendingTransaction).toHaveBeenCalledOnce();
    expect(effects.handleError).toHaveBeenCalledWith(expect.objectContaining({ error: timeout }));
    expect(execution.transfer).toHaveBeenCalledOnce();
  });
});
