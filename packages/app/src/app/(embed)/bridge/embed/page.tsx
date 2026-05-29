import { SearchParamsProps } from '@/app/src/types';
import { PathnameEnum } from '@/bridge/constants';

import EmbedPageWrapper from './EmbedPageWrapper';

export default async function EmbededPage(props: SearchParamsProps) {
  const searchParams = await props.searchParams;
  return <EmbedPageWrapper searchParams={searchParams} redirectPath={PathnameEnum.EMBED} />;
}
