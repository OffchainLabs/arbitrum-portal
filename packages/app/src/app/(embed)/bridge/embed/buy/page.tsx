import { addOrbitChainsToArbitrumSDK } from 'packages/app/src/initialization';
import { sanitizeAndRedirect } from 'packages/app/src/utils/sanitizeAndRedirect';

import { Toast } from '@/bridge/components/common/atoms/Toast';

import BridgeClient from '../../../../(with-sidebar)/bridge/BridgeClient';

export default async function EmbededBuyPage({
  searchParams,
}: {
  searchParams: {
    [key: string]: string | string[] | undefined;
  };
}) {
  if (searchParams.sanitized !== 'true') {
    addOrbitChainsToArbitrumSDK();
    await sanitizeAndRedirect(searchParams, '/bridge/embed/buy');
  }

  return (
    <>
      <BridgeClient />
      <Toast />
    </>
  );
}
