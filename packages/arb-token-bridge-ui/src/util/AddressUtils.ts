import bs58 from 'bs58';
import { utils } from 'ethers';
import { isAddress as isEvmAddress } from 'viem';

import { getWalletEcosystem } from '../wallet/getWalletEcosystem';

function isValidSolanaAddress(address: string): boolean {
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
  return address && isEvmAddress(address, { strict: false }) ? address.toLowerCase() : address;
}

const addressValidators = { evm: utils.isAddress, solana: isValidSolanaAddress };

export function isValidAddress(address: string | undefined): boolean {
  return Boolean(address && Object.values(addressValidators).some((validate) => validate(address)));
}

export function isValidAddressForChain(address: string | undefined, chainId: number): boolean {
  if (!address) return false;
  try {
    return addressValidators[getWalletEcosystem(chainId)](address);
  } catch {
    return false;
  }
}

export function addressesEqual(address1: string | undefined, address2: string | undefined) {
  return Boolean(address1 && address2 && normalizeAddress(address1) === normalizeAddress(address2));
}
