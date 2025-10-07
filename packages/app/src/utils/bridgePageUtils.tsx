import { onrampServices } from '@/bridge/components/BuyPanel/utils';
import { PathnameEnum } from '@/bridge/constants';

import { addOrbitChainsToArbitrumSDK } from '../initialization';
import { sanitizeAndRedirect } from './sanitizeAndRedirect';

export type Slug = (typeof onrampServices)[number]['slug'];

export interface BridgePageProps {
  searchParams: { [key: string]: string | string[] | undefined };
  redirectPath: PathnameEnum | `${PathnameEnum.BUY}/${Slug}` | `${PathnameEnum.EMBED_BUY}/${Slug}`;
}

export async function initializeBridgePage({ searchParams, redirectPath }: BridgePageProps) {
  /**
   * This code is run on every query param change,
   * we don't want to sanitize every query param change.
   * It should only be executed once per user per session.
   */
  if (searchParams.sanitized !== 'true') {
    addOrbitChainsToArbitrumSDK();
    await sanitizeAndRedirect(searchParams, redirectPath);
  }
}
