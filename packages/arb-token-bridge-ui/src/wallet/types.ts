import type { UseAppKitAccountReturn } from '@reown/appkit/react';

export type WalletEcosystem = 'evm' | 'solana';

export type WalletStatus = NonNullable<UseAppKitAccountReturn['status']>;

export interface WalletAccount {
  address?: string;
  chain?: {
    id: number;
  };
  ecosystem: WalletEcosystem;
  status: WalletStatus;
}

export interface WalletHandle {
  ecosystem: WalletEcosystem;
  account: WalletAccount;
  isConnected: boolean;
  disconnect: () => Promise<void>;
}
