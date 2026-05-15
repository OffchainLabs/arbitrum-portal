import { Slug } from 'packages/app/src/utils/bridgePageUtils';

import { PathnameEnum } from '@/bridge/constants';

import EmbedPageWrapper from '../../EmbedPageWrapper';

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
  params: Promise<{ slug: Slug }>;
};

export default async function EmbeddedBuyOnrampServicePage({ searchParams, params }: Props) {
  const resolvedSearchParams = await searchParams;
  const { slug } = await params;

  return (
    <EmbedPageWrapper
      searchParams={resolvedSearchParams}
      redirectPath={`${PathnameEnum.EMBED_BUY}/${slug}`}
    />
  );
}
