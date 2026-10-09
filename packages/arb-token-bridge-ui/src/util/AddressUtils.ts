import bs58 from 'bs58';
import { utils } from 'ethers';

import type { WalletEcosystem } from '../wallet/types';

export type EvmAddress = `0x${string}`;
export type SolanaAddress = string;
export type Address = EvmAddress | SolanaAddress;

export function isValidSolanaAddress(address: string | undefined): boolean {
  if (!address || address.startsWith('0x')) return false;
  try {
    return bs58.decode(address).length === 32;
  } catch {
    return false;
  }
}

export function normalizeAddress(address: string): string;
export function normalizeAddress(address: undefined): undefined;
export function normalizeAddress(address: string | undefined): string | undefined;
export function normalizeAddress(address: string | undefined): string | undefined {
  if (!address) return address;
  const prefixedAddress = address.startsWith('0X') ? `0x${address.slice(2)}` : address;
  return prefixedAddress.startsWith('0x') && utils.isAddress(prefixedAddress)
    ? prefixedAddress.toLowerCase()
    : address;
}

export function addressesEqual(address1: string | undefined, address2: string | undefined) {
  const normalizedAddress1 = normalizeAddress(address1);
  const normalizedAddress2 = normalizeAddress(address2);
  return Boolean(
    normalizedAddress1 && normalizedAddress2 && normalizedAddress1 === normalizedAddress2,
  );
}

export const ecosystemAddressValidators: Record<WalletEcosystem, (address: string) => boolean> = {
  evm: utils.isAddress,
  solana: isValidSolanaAddress,
};

export function isValidAddress(address: string | undefined): boolean {
  return Boolean(
    address && Object.values(ecosystemAddressValidators).some((validate) => validate(address)),
  );
}
