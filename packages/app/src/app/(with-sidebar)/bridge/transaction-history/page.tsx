import { PathnameEnum } from '@/bridge/constants';

import BridgePageWrapper from '../BridgePageWrapper';
import { generateMetadata } from '../page';

type Props = {
  searchParams: { [key: string]: string | string[] | undefined };
};

export { generateMetadata };

export default async function BridgeBuyPage({ searchParams }: Props) {
  return <BridgePageWrapper searchParams={searchParams} redirectPath={PathnameEnum.TX_HISTORY} />;
}
