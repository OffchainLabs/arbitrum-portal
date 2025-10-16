import { PathnameEnum } from '@/bridge/constants';

import EmbedPageWrapper from '../EmbedPageWrapper';

export default function EmbeddedBuyPage({
  searchParams,
}: {
  searchParams: {
    [key: string]: string | string[] | undefined;
  };
}) {
  return <EmbedPageWrapper searchParams={searchParams} redirectPath={PathnameEnum.EMBED_BUY} />;
}
