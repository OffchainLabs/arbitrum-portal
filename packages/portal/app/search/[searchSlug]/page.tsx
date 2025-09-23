import {
  ServerSideAppProps,
  getServerSideAppParams,
} from '@/common/getServerSideAppParams';
import { FullPageSearchResults } from '@/components/FullPageSearchResults';
import { getSearchResults } from '@/common/getSearchResults';
import { Metadata } from 'next';
import { getMetaData } from '@/common/getMetaData';

// Generate server-side metadata for this page
export function generateMetadata(props: ServerSideAppProps): Metadata {
  return getMetaData(props);
}

export default function SearchPage(props: ServerSideAppProps) {
  const { searchString } = getServerSideAppParams(props);

  const searchResults = getSearchResults(searchString);

  return (
    <>
      <FullPageSearchResults
        searchString={searchString}
        searchResults={searchResults}
      />
    </>
  );
}
