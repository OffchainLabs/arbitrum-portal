import bs58 from 'bs58';
import { utils } from 'ethers';

import { getWalletEcosystem } from '../wallet/getWalletEcosystem';
import type { WalletEcosystem } from '../wallet/types';

export type EvmAddress = `0x${string}`;
export type SolanaAddress = string;
export type Address = EvmAddress | SolanaAddress;

function isValidSolanaAddress(address = ''): boolean {
  try {
    return bs58.decode(address).length === 32;
  } catch {
    return false;
  }
}

export function normalizeAddress(address: Address): Address;
export function normalizeAddress(address: undefined): undefined;
export function normalizeAddress(address: Address | undefined): Address | undefined;
export function normalizeAddress(address: Address | undefined): Address | undefined {
  if (addressValidators.isSolana(address)) return address;
  if (addressValidators.isEvm(address)) return address.toLowerCase();
  return address;
}

const addressValidators = {
  isEvm: (address: string | undefined): address is EvmAddress => utils.isAddress(address ?? ''),
  isSolana: isValidSolanaAddress,
};

const ecosystemAddressValidators: Record<WalletEcosystem, (address: string) => boolean> = {
  evm: addressValidators.isEvm,
  solana: addressValidators.isSolana,
};

export function isValidAddress(address: string | undefined): boolean {
  return Boolean(address && Object.values(addressValidators).some((validate) => validate(address)));
}

export function isValidAddressForChain(address: string | undefined, chainId: number): boolean {
  if (!address) return false;
  try {
    return ecosystemAddressValidators[getWalletEcosystem(chainId)](address);
  } catch {
    return false;
  }
}

export function addressesEqual(address1: Address | undefined, address2: Address | undefined) {
  return Boolean(address1 && address2 && normalizeAddress(address1) === normalizeAddress(address2));
}
