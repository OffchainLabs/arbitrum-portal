import { BigNumber } from 'ethers';
import { arbitrum, mainnet } from 'viem/chains';
import { describe, expect, it, vi } from 'vitest';

import {
  type TransferCallbacks,
  type TransferSubmission,
  executeTransfer,
} from '../application/executeTransfer';
import { type ERC20BridgeToken, TokenType } from '../hooks/arbTokenBridge.types';
import { createBalanceService } from '../wallet/balance/createBalanceService';
import { createBalanceClientResolver } from '../wallet/balance/getBalanceClient';
import { selectWallets } from '../wallet/selectWallets';
import type { BalanceClient } from '../wallet/types';

vi.mock('../application/evmExecutionRuntime', () => ({
  switchEvmTransferNetwork: vi.fn(),
  getEvmExecutionRuntime: () => {
    throw new Error('An injected execution must not load a wallet SDK.');
  },
}));

type Ecosystem = 'evm' | 'solana' | 'fixture';
const registrations = [
  { ecosystem: 'evm', chainId: 1, address: '0x0000000000000000000000000000000000000001' },
  {
    ecosystem: 'solana',
    chainId: 1151111081099710,
    address: 'So11111111111111111111111111111111111111112',
  },
  { ecosystem: 'fixture', chainId: 9000001, address: 'ThirdAccountCaseSensitive' },
] as const satisfies readonly { ecosystem: Ecosystem; chainId: number; address: string }[];

function getEcosystem(chainId: number): Ecosystem {
  const registration = registrations.find((entry) => entry.chainId === chainId);
  if (!registration) throw new Error('Unknown test chain');
  return registration.ecosystem;
}

const wallets = {
  evm: { account: { address: registrations[0].address }, isConnected: true },
  solana: { account: { address: registrations[1].address }, isConnected: true },
  fixture: { account: { address: registrations[2].address }, isConnected: true },
};

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
    resetAmountAndSwitchToTransactionHistoryTab: vi.fn(),
    clearRoute: vi.fn(),
    onSubmitted: vi.fn(),
    refreshTokenBalances: vi.fn(async () => {}),
  };
}

describe('ecosystem registration through application boundaries', () => {
  it.each(registrations)(
    'dispatches $ecosystem wallets, balances and execution using the existing token shape',
    async ({ ecosystem, chainId, address }) => {
      const { sourceWallet, destinationWallet } = selectWallets({
        wallets,
        sourceChainId: chainId,
        destinationChainId: 1,
        getEcosystem,
      });
      expect(sourceWallet).toBe(wallets[ecosystem]);
      expect(destinationWallet).toBe(wallets.evm);
      const token: ERC20BridgeToken = {
        type: TokenType.ERC20,
        name: 'Registered token',
        symbol: 'TOKEN',
        decimals: 9,
        address: 'CaseSensitiveMint',
        l2Address: 'DestinationToken',
        listIds: new Set(),
      };
      const amount = 9007199254740993n;
      const fetchBalance = vi.fn(async () => ({ [token.address]: amount }));
      const clients: Record<Ecosystem, BalanceClient> = {
        evm: { fetchBalance },
        solana: { fetchBalance },
        fixture: { fetchBalance },
      };
      const balances = createBalanceService(createBalanceClientResolver(clients, getEcosystem));
      const unsubscribe = balances.subscribe({
        chainId,
        walletAddress: address,
        tokenAddresses: [token.address],
      });
      expect(
        await balances.fetchBalances({ chainId, walletAddress: sourceWallet.account.address }),
      ).toEqual({ [token.address]: amount });
      expect(fetchBalance).toHaveBeenCalledWith({
        chainId,
        walletAddress: address,
        tokenAddresses: [token.address],
      });
      const submission: TransferSubmission = {
        networks: { sourceChain: { ...mainnet, id: chainId }, destinationChain: arbitrum },
        childChain: arbitrum,
        parentChain: mainnet,
        walletAddress: address,
        destinationWalletAddress: destinationWallet.account.address,
        selectedToken: token,
        amount: amount.toString(),
        amount2: '',
        amountBigNumber: BigNumber.from(amount),
        selectedRoute: undefined,
        context: undefined,
        nativeCurrency: { name: 'Native', symbol: 'NATIVE', decimals: 9, isCustom: false },
        nativeCurrencyDecimalsOnSourceChain: 9,
        warningTokens: {},
        isDepositMode: true,
        isSmartContractWallet: false,
        isBatchTransferSupported: false,
        isSwapTransfer: false,
        isTransferAllowed: true,
      };
      const effects = callbacks();
      const implementation = vi.fn(
        async (submitted: TransferSubmission, effects: TransferCallbacks) => {
          effects.onSubmitted();
          await effects.refreshTokenBalances({
            chainId: submitted.networks.sourceChain.id,
            walletAddress: submitted.walletAddress,
          });
          return 'transaction-id';
        },
      );
      await expect(
        executeTransfer(submission, effects, { [ecosystem]: implementation }, getEcosystem),
      ).resolves.toBe('transaction-id');
      expect(implementation).toHaveBeenCalledWith(submission, effects);
      expect(effects.onSubmitted).toHaveBeenCalledOnce();
      expect(effects.refreshTokenBalances).toHaveBeenCalledWith({
        chainId,
        walletAddress: address,
      });
      await expect(executeTransfer(submission, effects, {}, getEcosystem)).rejects.toThrow(
        'unavailable',
      );
      expect(() => createBalanceClientResolver({}, getEcosystem)(chainId)).toThrow('not available');
      unsubscribe();
    },
  );

  it('rejects unknown registrations instead of choosing EVM', () => {
    expect(() =>
      selectWallets({ wallets, sourceChainId: -1, destinationChainId: 1, getEcosystem }),
    ).toThrow('Unknown test chain');
  });
});
