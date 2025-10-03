import type { Metadata } from 'next';
import { sanitizeAndRedirect } from 'packages/app/src/utils/sanitizeAndRedirect';

import { addOrbitChainsToArbitrumSDK } from '../../../../../initialization';
import BridgePageWrapper from '../../BridgePageWrapper';

type Props = {
  searchParams: { [key: string]: string | string[] | undefined };
  params: { slug: string };
};

export const metadata: Metadata = {
  title: 'On-Ramp to Arbitrum',
  description:
    "On-ramp directly to Arbitrum with one of several third party providers. Built to scale Ethereum, Arbitrum brings you 10x lower costs while inheriting Ethereum's security model. Arbitrum is a Layer 2 Optimistic Rollup.",
};

export default async function BridgeBuyOnrampServicePage({ searchParams, params }: Props) {
  /**
   * This code is run on every query param change,
   * we don't want to sanitize every query param change.
   * It should only be executed once per user per session.
   */
  if (searchParams.sanitized !== 'true') {
    addOrbitChainsToArbitrumSDK();
    await sanitizeAndRedirect(searchParams, `/bridge/buy/${params.slug}`);
  }

  return (
    <BridgePageWrapper searchParams={searchParams} redirectPath={`/bridge/buy/${params.slug}`} />
  );
}
