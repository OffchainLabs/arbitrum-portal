import EmbedPageWrapper from '../EmbedPageWrapper';

export default async function EmbeddedBuyPage({
  searchParams,
}: {
  searchParams: {
    [key: string]: string | string[] | undefined;
  };
}) {
  return <EmbedPageWrapper searchParams={searchParams} redirectPath="/bridge/embed/buy" />;
}
