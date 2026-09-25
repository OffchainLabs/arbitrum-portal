export type WalletEcosystem = 'evm' | 'solana';

export type WalletStatus = 'connected' | 'disconnected' | 'connecting' | 'reconnecting';

export type ConnectedWalletInfo = {
  name?: string;
  icon?: string;
};

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

export type SolanaWalletHandle = WalletHandleBase<'solana'> & {
  sendTransaction?: (serializedTransaction: Uint8Array) => Promise<string>;
  confirmTransaction?: (signature: string) => Promise<void>;
};

export type WalletHandle = EvmWalletHandle | SolanaWalletHandle;

export type WalletContextValue = {
  evm: EvmWalletHandle;
  solana: SolanaWalletHandle;
};

export type FetchBalanceInput = {
  chainId: number;
  walletAddress: string;
  tokenAddresses: string[];
};

export type FetchBalanceResult = Record<string, bigint>;

export type BalanceClient = {
  fetchBalance: (input: FetchBalanceInput) => Promise<FetchBalanceResult>;
};
