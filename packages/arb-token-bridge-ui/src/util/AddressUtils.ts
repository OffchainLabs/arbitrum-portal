import bs58 from 'bs58';
import { utils } from 'ethers';

import { getWalletEcosystem } from '../wallet/getWalletEcosystem';
import type { WalletEcosystem } from '../wallet/types';

export { addressesEqual } from './AddressEquality';

export type EvmAddress = `0x${string}`;
export type SolanaAddress = string & { readonly __brand: 'SolanaAddress' };
export type Address = EvmAddress | SolanaAddress;

export function isValidSolanaAddress(address: string | undefined): address is SolanaAddress {
  if (!address || address.startsWith('0x')) return false;
  try {
    return bs58.decode(address).length === 32;
  } catch {
    return false;
  }
}

export function parseSolanaAddress(address: string | undefined): SolanaAddress | undefined {
  return isValidSolanaAddress(address) ? address : undefined;
}

export function parseEvmAddress(address: string | undefined): EvmAddress | undefined {
  if (!address || !utils.isAddress(address)) return undefined;
  const normalized = utils.getAddress(address).toLowerCase();
  return normalized.startsWith('0x') && /^0x[0-9a-f]{40}$/.test(normalized)
    ? (normalized as EvmAddress)
    : undefined;
}

export function parseAddress(address: string | undefined, chainId: number): Address | undefined {
  try {
    switch (getWalletEcosystem(chainId)) {
      case 'evm':
        return parseEvmAddress(address);
      case 'solana':
        return parseSolanaAddress(address);
    }
  } catch {
    return undefined;
  }
}

export function normalizeAddress(address: Address): Address;
export function normalizeAddress(address: string): string;
export function normalizeAddress(address: undefined): undefined;
export function normalizeAddress(address: string | undefined): string | undefined;
export function normalizeAddress(address: string | undefined): string | undefined {
  if (!address) return address;
  if (address.startsWith('0x') && utils.isAddress(address)) return address.toLowerCase();
  return address;
}

const ecosystemAddressValidators: Record<WalletEcosystem, (address: string) => boolean> = {
  evm: utils.isAddress,
  solana: isValidSolanaAddress,
};

export function isValidAddress(address: string | undefined): boolean {
  return Boolean(address && (utils.isAddress(address) || isValidSolanaAddress(address)));
}

export function isValidAddressForChain(address: string | undefined, chainId: number): boolean {
  if (!address) return false;
  try {
    return ecosystemAddressValidators[getWalletEcosystem(chainId)](address);
  } catch {
    return false;
  }
}
