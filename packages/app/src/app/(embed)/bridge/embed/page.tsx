import { PathnameEnum } from '@/bridge/constants';

import EmbedPageWrapper from './EmbedPageWrapper';

export default function EmbededPage({
  searchParams,
}: {
  searchParams: {
    [key: string]: string | string[] | undefined;
  };
}) {
  return <EmbedPageWrapper searchParams={searchParams} redirectPath={PathnameEnum.EMBED} />;
}
