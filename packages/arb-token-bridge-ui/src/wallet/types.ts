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

export type BalanceHandle = {
  ecosystem: WalletEcosystem;
  fetchBalance: (input: FetchBalanceInput) => Promise<FetchBalanceResult>;
};

export interface WalletAccount {
  address?: string;
  chain?: {
    id: number;
  };
  ecosystem: WalletEcosystem;
  status: WalletStatus;
  walletInfo?: ConnectedWalletInfo;
}

export interface WalletHandle {
  ecosystem: WalletEcosystem;
  account: WalletAccount;
  isConnected: boolean;
  disconnect: () => Promise<void>;
}
