import {
  ServerSideAppProps,
  getServerSideAppParams
} from '@/portal/common/getServerSideAppParams'
import { FullPageSearchResults } from '@/portal/components/FullPageSearchResults'
import { getSearchResults } from '@/portal/common/getSearchResults'
import { Metadata } from 'next'
import { getMetaData } from '@/portal/common/getMetaData'

// Generate server-side metadata for this page
export function generateMetadata(props: ServerSideAppProps): Metadata {
  return getMetaData(props)
}

export default function SearchPage(props: ServerSideAppProps) {
  const { searchString } = getServerSideAppParams(props)

  const searchResults = getSearchResults(searchString)

  return (
    <FullPageSearchResults
      searchString={searchString}
      searchResults={searchResults}
    />
  )
}
