import { sanitizeAndRedirect } from 'packages/app/src/utils/sanitizeAndRedirect';

import { addOrbitChainsToArbitrumSDK } from '../../../../initialization';
import BridgeClient from '../BridgeClient';

type Props = {
  searchParams: { [key: string]: string | string[] | undefined };
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
