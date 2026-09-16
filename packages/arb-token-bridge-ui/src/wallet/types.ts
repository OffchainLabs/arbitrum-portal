import type { EvmAddress, SolanaAddress } from '../util/AddressUtils';

export type WalletEcosystem = 'evm' | 'solana';

export type WalletStatus = 'connected' | 'disconnected' | 'connecting' | 'reconnecting';

export type ConnectedWalletInfo = {
  name?: string;
  icon?: string;
};

export type WalletAccount<Ecosystem extends WalletEcosystem> = {
  ecosystem: Ecosystem;
  address?: Ecosystem extends 'evm' ? EvmAddress : SolanaAddress;
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

export type SolanaWalletHandle = WalletHandleBase<'solana'>;

export type WalletHandle = WalletContextValue[WalletEcosystem];

// Mapped over `WalletEcosystem`, so a missing ecosystem fails where its types are declared
export type WalletContextValue = {
  [Ecosystem in WalletEcosystem]: WalletHandleBase<Ecosystem>;
};
