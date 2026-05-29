import { SearchParamsProps } from '@/app/src/types';
import { PathnameEnum } from '@/bridge/constants';

import { initializeBridgePage } from '../../../../utils/bridgePageUtils';
import { generateMetadata } from '../page';

export { generateMetadata };

export default async function BridgeTxHistoryPage(props: SearchParamsProps) {
  const searchParams = await props.searchParams;
  await initializeBridgePage({ searchParams, redirectPath: PathnameEnum.TX_HISTORY });
  // The App is rendered by the bridge layout; the page only initializes it.
  return null;
}
