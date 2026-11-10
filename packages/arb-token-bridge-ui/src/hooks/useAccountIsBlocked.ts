import useSWRImmutable from 'swr/immutable';

import { Address, normalizeAddress } from '../util/AddressUtils';
import { trackEvent } from '../util/AnalyticsUtils';
import { isE2eTestingEnvironment, isProductionEnvironment } from '../util/CommonUtils';
import { captureSentryErrorWithExtraData } from '../util/SentryUtils';
import { logger } from '../util/logger';
import { useWallets } from '../wallet/hooks/useWallets';
import type { WalletEcosystem, WalletHandle } from '../wallet/types';

/**
 * Checks if an address is blocked using the external Screenings API service.
 * @param {Address} address - The address to check.
 * @param {WalletEcosystem} ecosystem - The ecosystem of the address.
 * @returns {Promise<boolean>} true if blocked or the request fails
 */
async function isBlocked(address: Address, ecosystem: WalletEcosystem): Promise<boolean> {
  try {
    if (!isProductionEnvironment || isE2eTestingEnvironment) {
      return false;
    }

    const url = new URL(process.env.NEXT_PUBLIC_SCREENING_API_ENDPOINT ?? '');
    url.searchParams.set('address', address);
    // The API screens EVM addresses unless told otherwise
    if (ecosystem === 'solana') {
      url.searchParams.set('chain', 'solana');
    }
    url.searchParams.set('ref', window.location.hostname);

    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const { blocked } = await response.json();
    return blocked;
  } catch (error) {
    logger.error('Failed to check if address is blocked', error);
    captureSentryErrorWithExtraData({
      error,
      originFunction: 'isBlocked',
      additionalData: { address, ecosystem },
    });

    return false;
  }
}

async function fetcher(address: Address, ecosystem: WalletEcosystem): Promise<boolean> {
  const accountIsBlocked = await isBlocked(address, ecosystem);

  if (accountIsBlocked) {
    trackEvent('Address Block', { address });
  }

  return accountIsBlocked;
}

function useWalletIsBlocked(wallet: WalletHandle) {
  // Lowercases EVM addresses and keeps Solana addresses, which are case-sensitive
  const address = normalizeAddress(wallet.account.address) as Address | undefined;

  const { data: isBlocked } = useSWRImmutable(
    // Don't fetch without an address
    address ? ([address, wallet.ecosystem, 'useAccountIsBlocked'] as const) : null,
    ([_address, _ecosystem]) => fetcher(_address, _ecosystem),
  );

  return { address, isBlocked };
}

/** Screens the source and destination wallets. `blockedAddress` is the first blocked one. */
export function useAccountIsBlocked() {
  const { sourceWallet, destinationWallet } = useWallets();
  const source = useWalletIsBlocked(sourceWallet);
  const destination = useWalletIsBlocked(destinationWallet);

  return {
    isBlocked: source.isBlocked || destination.isBlocked,
    blockedAddress: source.isBlocked ? source.address : destination.address,
  };
}
