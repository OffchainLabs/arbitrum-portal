import { Metadata } from 'next';

import { getMetaData } from '@/portal/common/getMetaData';
import { getSearchResults } from '@/portal/common/getSearchResults';
import { ServerSideAppProps, getServerSideAppParams } from '@/portal/common/getServerSideAppParams';
import { FullPageSearchResults } from '@/portal/components/FullPageSearchResults';

// Generate server-side metadata for this page
export function generateMetadata(props: ServerSideAppProps): Promise<Metadata> {
  return getMetaData(props);
}

export default async function SearchPage(props: ServerSideAppProps) {
  const { searchString } = await getServerSideAppParams(props);

  const searchResults = getSearchResults(searchString);

  return <FullPageSearchResults searchString={searchString} searchResults={searchResults} />;
}
