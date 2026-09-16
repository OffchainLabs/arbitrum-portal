import { useMemo } from 'react';
import useSWRImmutable from 'swr/immutable';

import { normalizeAddress } from '../util/AddressUtils';
import { trackEvent } from '../util/AnalyticsUtils';
import { isE2eTestingEnvironment, isProductionEnvironment } from '../util/CommonUtils';
import { captureSentryErrorWithExtraData } from '../util/SentryUtils';
import { logger } from '../util/logger';
import { useWallets } from '../wallet/hooks/useWallets';

/**
 * Checks if an address is blocked using the external Screenings API service.
 * @param address - The address to check.
 * @returns {Promise<boolean>} true if blocked or the request fails
 */
async function isBlocked(address: string): Promise<boolean> {
  try {
    if (!isProductionEnvironment || isE2eTestingEnvironment) {
      return false;
    }

    const url = new URL(process.env.NEXT_PUBLIC_SCREENING_API_ENDPOINT ?? '');
    url.searchParams.set('address', address);
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
      additionalData: { address },
    });

    return false;
  }
}

async function fetcher(address: string): Promise<boolean> {
  const accountIsBlocked = await isBlocked(address);

  if (accountIsBlocked) {
    trackEvent('Address Block', { address });
  }

  return accountIsBlocked;
}

export function useAccountIsBlocked() {
  const { sourceWallet } = useWallets();
  const address = sourceWallet.account.address;

  const queryKey = useMemo(() => {
    if (typeof address === 'undefined') {
      // Don't fetch
      return null;
    }

    return [normalizeAddress(address), 'useAccountIsBlocked'] as const;
  }, [address]);

  const { data: isBlocked } = useSWRImmutable(
    queryKey,
    // Extracts the first element of the query key as the fetcher param
    ([_address]) => fetcher(_address),
  );

  return { address, isBlocked };
}
