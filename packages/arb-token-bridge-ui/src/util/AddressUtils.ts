import { Provider } from '@ethersproject/providers';

import { getAPIBaseUrl } from '.';
import { getProviderForChainId } from '../token-bridge-sdk/utils';
import { type ValidationOptions, ecosystems } from '../wallet/ecosystems';
import { getEcosystemConfig } from '../wallet/ecosystems/getEcosystemConfig';
import { logger } from './logger';

export type EvmAddress = `0x${string}`;
export type SolanaAddress = string;
export type Address = EvmAddress | SolanaAddress;

export { addressesEqual } from './AddressEquality';

export async function addressIsSmartContract(address: string, chainId: number) {
  const provider = getProviderForChainId(chainId);
  try {
    return (await provider.getCode(address)).length > 2;
  } catch (_) {
    return false;
  }
}

export function normalizeAddress(address: string): string;
export function normalizeAddress(address: undefined): undefined;
export function normalizeAddress(address: string | undefined): string | undefined;
export function normalizeAddress(address: string | undefined): string | undefined {
  if (!address) return address;
  const adapter = Object.values(ecosystems)
    .map((ecosystem) => ecosystem.address)
    .find((adapter) => adapter.isValid(adapter.normalize(address)));
  return adapter ? adapter.normalize(address) : address;
}

export function isValidAddress(address: string | undefined, options?: ValidationOptions): boolean {
  return Boolean(
    address &&
      Object.values(ecosystems).some((ecosystem) => ecosystem.address.isValid(address, options)),
  );
}

function getAddressAdapter(chainId: number) {
  try {
    return getEcosystemConfig(chainId).address;
  } catch {
    return undefined;
  }
}

export function isValidAddressForChain(address: string | undefined, chainId: number): boolean {
  if (!address) return false;
  return getAddressAdapter(chainId)?.isValid(address) ?? false;
}

export function normalizeAddressForChain(address: string, chainId: number): string {
  return getAddressAdapter(chainId)?.normalize(address) ?? address;
}

/**
 * Normalizes `address` for the chain's ecosystem, then validates it.
 * Returns `undefined` if the address is invalid or the chain is unsupported.
 *
 * EVM addresses are lowercased before validation, so any casing is accepted and the checksum is not enforced.
 */
export function parseAddressForChain(
  address: string | undefined,
  chainId: number,
): string | undefined {
  if (!address) return undefined;
  const normalizedAddress = normalizeAddressForChain(address, chainId);
  return isValidAddressForChain(normalizedAddress, chainId) ? normalizedAddress : undefined;
}

export async function addressIsDenylisted(address: string) {
  // The denylist consists of an array of addresses from Ethereum, Arbitrum One and Sepolia.
  // We do not separate them as it's unlikely for anyone to have a wallet address matching our contract addresses.
  try {
    const denylistResponse = await fetch(`${getAPIBaseUrl()}/api/denylist?address=${address}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    return (await denylistResponse.json()).data as boolean;
  } catch (error) {
    logger.error(error);
    return false;
  }
}

export function getNonce(
  address: string | undefined,
  { provider }: { provider: Provider },
): Promise<number> {
  if (typeof address === 'undefined') {
    return 0 as unknown as Promise<number>;
  }

  return provider.getTransactionCount(address);
}

/**
 * Binary-search for the lowest block where `address` has nonce > 0 — i.e. the
 * block of their first outgoing transaction. Useful as a lower bound for event-log
 * scans on chains without a working subgraph: the address can't have initiated a
 * withdrawal before they ever sent an L2 tx.
 *
 * Pre-condition: nonce > 0 at `latestBlock`.
 * Returns `0` if historical nonce lookups aren't supported by the RPC.
 */
export async function findFirstBlockWithNonce({
  address,
  provider,
  latestBlock,
}: {
  address: string;
  provider: Provider;
  latestBlock: number;
}): Promise<number> {
  try {
    let lo = 0;
    let hi = latestBlock;
    while (lo < hi) {
      const mid = Math.floor((lo + hi) / 2);
      // eslint-disable-next-line no-await-in-loop
      const nonce = await provider.getTransactionCount(address, mid);
      if (nonce > 0) {
        hi = mid;
      } else {
        lo = mid + 1;
      }
    }
    return lo;
  } catch (error) {
    logger.warn('findFirstBlockWithNonce failed, falling back to 0', error);
    return 0;
  }
}
