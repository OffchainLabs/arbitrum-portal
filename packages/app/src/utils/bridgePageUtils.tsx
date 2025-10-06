import { PathnameEnum } from '@/bridge/constants';

import { addOrbitChainsToArbitrumSDK } from '../initialization';
import { sanitizeAndRedirect } from './sanitizeAndRedirect';

export interface BridgePageProps {
  searchParams: { [key: string]: string | string[] | undefined };
  redirectPath: PathnameEnum;
}

export async function initializeBridgePage(
  searchParams: { [key: string]: string | string[] | undefined },
  redirectPath: PathnameEnum,
) {
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
