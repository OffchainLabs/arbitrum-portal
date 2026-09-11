import type { UseAppKitAccountReturn, useWalletInfo } from '@reown/appkit/react';

export type WalletEcosystem = 'evm' | 'solana';

export type WalletStatus = NonNullable<UseAppKitAccountReturn['status']>;

type ConnectedWalletInfo = NonNullable<ReturnType<typeof useWalletInfo>['walletInfo']>;

export type WalletAccount<Ecosystem extends WalletEcosystem> = {
  ecosystem: Ecosystem;
  address?: string;
  chainId?: number;
  status: WalletStatus;
  walletInfo?: ConnectedWalletInfo;
};

type WalletHandleBase<Ecosystem extends WalletEcosystem> = {
  ecosystem: Ecosystem;
  account: WalletAccount<Ecosystem>;
  isConnected: boolean;
  disconnect: () => Promise<void>;
};

export type EvmWalletHandle = WalletHandleBase<'evm'>;

export type SolanaTransactionSender = {
  sendTransaction: (serializedTransaction: Uint8Array) => Promise<string>;
};

export type SolanaWalletHandle = WalletHandleBase<'solana'> & {
  transactionSender?: SolanaTransactionSender;
};

export type WalletHandle = EvmWalletHandle | SolanaWalletHandle;

export type WalletContextValue = {
  evm: EvmWalletHandle;
  solana: SolanaWalletHandle;
};
