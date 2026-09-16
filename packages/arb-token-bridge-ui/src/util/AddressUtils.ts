import bs58 from 'bs58';
import { utils } from 'ethers';

const evmAddressPattern = /^0x[0-9a-fA-F]{40}$/;

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
  return address && evmAddressPattern.test(address) ? address.toLowerCase() : address;
}

export function isValidAddress(address: string | undefined): boolean {
  return Boolean(address && (utils.isAddress(address) || isValidSolanaAddress(address)));
}

export function addressesEqual(address1: string | undefined, address2: string | undefined) {
  return Boolean(address1 && address2 && normalizeAddress(address1) === normalizeAddress(address2));
}
