import type { SolanaProviderOptions } from '@lifi/sdk';
import type { WalletClient } from 'viem';

import type { EvmAddress, SolanaAddress } from '../util/AddressUtils';

export type WalletEcosystem = 'evm' | 'solana';

export type WalletStatus = 'connected' | 'disconnected' | 'connecting' | 'reconnecting';

/** Fails to compile on its own line until `T` has an entry for every ecosystem */
type ByEcosystem<T extends Record<WalletEcosystem, unknown>> = T;

export type AddressByEcosystem = ByEcosystem<{ evm: EvmAddress; solana: SolanaAddress }>;

// Falls back to `string` for an ecosystem without an entry, so the error stays on the map above
type AddressOf<Ecosystem extends WalletEcosystem> = Ecosystem extends keyof AddressByEcosystem
  ? AddressByEcosystem[Ecosystem]
  : string;

export type ConnectedWalletInfo = {
  name?: string;
  icon?: string;
};

export type WalletAccount<Ecosystem extends WalletEcosystem> = {
  ecosystem: Ecosystem;
  address?: AddressOf<Ecosystem>;
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

export type Signers = ByEcosystem<{ evm: EvmSigner; solana: SolanaSigner }>;

// Falls back to the base signer for an ecosystem without an entry, so the error stays on `Signers`
type SignerOf<Ecosystem extends WalletEcosystem> = Ecosystem extends keyof Signers
  ? Signers[Ecosystem]
  : SignerBase;

type WalletHandleBase<Ecosystem extends WalletEcosystem> = {
  ecosystem: Ecosystem;
  account: WalletAccount<Ecosystem>;
  isConnected: boolean;
  /** Old Trust Wallet versions can sign on the wrong network, so transfers warn first. */
  needsNetworkSigningWarning?: boolean;
  disconnect: () => Promise<void>;
  signer: SignerOf<Ecosystem>;
};

export type EvmWalletHandle = WalletHandleBase<'evm'>;

export type SolanaWalletHandle = WalletHandleBase<'solana'>;

export type WalletHandle = WalletContextValue[WalletEcosystem];

// Mapped over `WalletEcosystem`, so a missing ecosystem fails where its types are declared
export type WalletContextValue = {
  [Ecosystem in WalletEcosystem]: WalletHandleBase<Ecosystem>;
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
