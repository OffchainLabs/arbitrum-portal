import { Slug } from 'packages/app/src/utils/bridgePageUtils';

import { PathnameEnum } from '@/bridge/constants';

import EmbedPageWrapper from '../../EmbedPageWrapper';

type Props = {
  searchParams: { [key: string]: string | string[] | undefined };
  params: { slug: Slug };
};

export default function EmbeddedBuyOnrampServicePage({ searchParams, params }: Props) {
  return (
    <EmbedPageWrapper
      searchParams={searchParams}
      redirectPath={`${PathnameEnum.EMBED_BUY}/${params.slug}`}
    />
  );
}
