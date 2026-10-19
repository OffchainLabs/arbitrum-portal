import type { SolanaProviderOptions } from '@lifi/sdk';
import type { WalletClient } from 'viem';

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

export type SolanaWalletAdapter = Awaited<
  ReturnType<NonNullable<SolanaProviderOptions['getWalletAdapter']>>
>;

/** Signs LiFi route steps. Each method reads the wallet when called, not when the signer is created. */
type SignerBase = {
  getAddress: () => string | undefined;
};

export type EvmSigner = SignerBase & {
  getWalletClient: (chainId?: number) => Promise<WalletClient>;
};

export type SolanaSigner = SignerBase & {
  /** Throws when no Solana wallet is connected */
  getWalletAdapter: () => Promise<SolanaWalletAdapter>;
};

export type Signers = { evm: EvmSigner; solana: SolanaSigner };

type WalletHandleBase<Ecosystem extends WalletEcosystem> = {
  ecosystem: Ecosystem;
  account: WalletAccount<Ecosystem>;
  isConnected: boolean;
  /** Old Trust Wallet versions can sign on the wrong network, so transfers warn first. */
  needsNetworkSigningWarning?: boolean;
  disconnect: () => Promise<void>;
  signer: Signers[Ecosystem];
};

export type EvmWalletHandle = WalletHandleBase<'evm'>;

export type SolanaWalletHandle = WalletHandleBase<'solana'>;

export type WalletHandle = EvmWalletHandle | SolanaWalletHandle;

export type WalletContextValue = {
  [Ecosystem in WalletEcosystem]: Extract<WalletHandle, { ecosystem: Ecosystem }>;
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
