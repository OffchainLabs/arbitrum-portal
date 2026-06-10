import type { TransactionRequest } from '@ethersproject/providers';
import type { ConnectedWalletInfo } from '@reown/appkit-controllers';
import type { UseAppKitAccountReturn } from '@reown/appkit/react';
import type { BigNumber } from 'ethers';

export type WalletEcosystem = 'evm' | 'solana';

export type WalletStatus = NonNullable<UseAppKitAccountReturn['status']>;

export type SendTransactionResult = {
  hash: string;
  wait?: () => Promise<unknown>;
};

export type FetchBalanceResult = Record<string, BigNumber>;

export type FetchBalanceInput = {
  chainId: number;
  walletAddress: string;
  tokenAddresses: string[];
};

export type EvmSendTransactionInput = {
  ecosystem: 'evm';
  txRequest: TransactionRequest;
};

export type SolanaSendTransactionInput = {
  ecosystem: 'solana';
  serializedTransaction: string;
};

export type SignerHandle =
  | {
      ecosystem: 'evm';
      sendTransaction: (input: EvmSendTransactionInput) => Promise<SendTransactionResult>;
    }
  | {
      ecosystem: 'solana';
      sendTransaction: (input: SolanaSendTransactionInput) => Promise<SendTransactionResult>;
    };

type BalanceHandleBase<Ecosystem extends WalletEcosystem> = {
  ecosystem: Ecosystem;
  fetchBalance: (input: FetchBalanceInput) => Promise<FetchBalanceResult>;
};

export type EvmBalanceHandle = BalanceHandleBase<'evm'>;
export type SolanaBalanceHandle = BalanceHandleBase<'solana'>;
export type BalanceHandle = EvmBalanceHandle | SolanaBalanceHandle;

export interface WalletAccount<Ecosystem extends WalletEcosystem = WalletEcosystem> {
  address?: string;
  chain?: {
    id: number;
  };
  ecosystem: Ecosystem;
  status: WalletStatus;
  walletInfo?: ConnectedWalletInfo;
}

type WalletHandleBase<Ecosystem extends WalletEcosystem> = {
  ecosystem: Ecosystem;
  account: WalletAccount<Ecosystem>;
  isConnected: boolean;
  disconnect: () => Promise<void>;
};

export type EvmWalletHandle = WalletHandleBase<'evm'> & {
  sendTransaction: (input: EvmSendTransactionInput) => Promise<SendTransactionResult>;
};

export type SolanaWalletHandle = WalletHandleBase<'solana'> & {
  sendTransaction: (input: SolanaSendTransactionInput) => Promise<SendTransactionResult>;
};

type AdaptedWalletHandle<Ecosystem extends WalletEcosystem> = WalletHandleBase<Ecosystem> & {
  sendTransaction: (transactionRequest: unknown) => Promise<SendTransactionResult>;
};

export type WalletHandle = AdaptedWalletHandle<'evm'> | AdaptedWalletHandle<'solana'>;
