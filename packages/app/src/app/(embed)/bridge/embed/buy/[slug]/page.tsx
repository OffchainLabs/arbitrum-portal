import EmbedPageWrapper from '../../EmbedPageWrapper';

type Props = {
  searchParams: { [key: string]: string | string[] | undefined };
  params: { slug: string };
};

export default async function EmbeddedBuyOnrampServicePage({ searchParams, params }: Props) {
  return (
    <EmbedPageWrapper
      searchParams={searchParams}
      redirectPath={`/bridge/embed/buy/${params.slug} `}
    />
  );
}
