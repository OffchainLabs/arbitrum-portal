import { Toast } from '@/bridge/components/common/atoms/Toast';

import BridgeClient from '../../../(with-sidebar)/bridge/BridgeClient';
import { BridgePageProps, initializeBridgePage } from '../../../../utils/bridgePageUtils';

export default async function EmbedPageWrapper({ searchParams, redirectPath }: BridgePageProps) {
  await initializeBridgePage(searchParams, redirectPath);

  return (
    <>
      <BridgeClient />
      <Toast />
    </>
  );
}
