import { redirect } from 'next/navigation';

import { onrampServices } from '@/bridge/components/BuyPanel/utils';
import { PathnameEnum } from '@/bridge/constants';

import { addOrbitChainsToArbitrumSDK } from '../initialization';
import { getSanitizedRedirectPath } from './sanitizeAndRedirect';

export type Slug = (typeof onrampServices)[number]['slug'];

export interface BridgePageProps {
  searchParams: { [key: string]: string | string[] | undefined };
  redirectPath: PathnameEnum | `${PathnameEnum.BUY}/${Slug}` | `${PathnameEnum.EMBED_BUY}/${Slug}`;
}

export async function getBridgePageSanitizedRedirectPath({
  searchParams,
  redirectPath,
}: BridgePageProps) {
  /**
   * This code is run on every query param change,
   * we don't want to sanitize every query param change.
   * It should only be executed once per user per session.
   */
  if (searchParams.sanitized === 'true') {
    return null;
  }

  addOrbitChainsToArbitrumSDK();

  return getSanitizedRedirectPath(searchParams, redirectPath);
}

export async function initializeBridgePage({ searchParams, redirectPath }: BridgePageProps) {
  const sanitizedRedirectPath = await getBridgePageSanitizedRedirectPath({
    searchParams,
    redirectPath,
  });

  if (sanitizedRedirectPath) {
    redirect(sanitizedRedirectPath);
  }
}
