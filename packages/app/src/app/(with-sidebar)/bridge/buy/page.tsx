import { Metadata } from 'next';
import { sanitizeAndRedirect } from 'packages/app/src/utils/sanitizeAndRedirect';

import { addOrbitChainsToArbitrumSDK } from '../../../../initialization';
import BridgeClient from '../BridgeClient';

type Props = {
  searchParams: { [key: string]: string | string[] | undefined };
};

export const metadata: Metadata = {
  title: 'On-Ramp to Arbitrum',
  description:
    'On-ramp directly to Arbitrum with one of several third party providers. Built to scale Ethereum, Arbitrum brings you 10x lower costs while inheriting Ethereum’s security model. Arbitrum is a Layer 2 Optimistic Rollup.',
};

export default async function BridgeBuyPage({ searchParams }: Props) {
  /**
   * This code is run on every query param change,
   * we don't want to sanitize every query param change.
   * It should only be executed once per user per session.
   */
  if (searchParams.sanitized !== 'true') {
    addOrbitChainsToArbitrumSDK();
    await sanitizeAndRedirect(searchParams, '/bridge/buy');
  }

  return (
    <main className="bridge-wrapper relative flex h-full flex-1 flex-col overflow-y-auto">
      <BridgeClient />
    </main>
  );
}
