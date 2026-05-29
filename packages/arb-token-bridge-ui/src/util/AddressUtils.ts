import { Provider } from '@ethersproject/providers';

import { getAPIBaseUrl } from '.';
import { getProviderForChainId } from '../token-bridge-sdk/utils';
import { logger } from './logger';

export type Address = `0x${string}`;

export function addressesEqual(address1: string | undefined, address2: string | undefined) {
  return address1?.trim().toLowerCase() === address2?.trim().toLowerCase();
}

export async function addressIsSmartContract(address: string, chainId: number) {
  const provider = getProviderForChainId(chainId);
  try {
    return (await provider.getCode(address)).length > 2;
  } catch (_) {
    return false;
  }
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
