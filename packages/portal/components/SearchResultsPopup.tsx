import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import Fuse from 'fuse.js';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { twMerge } from 'tailwind-merge';

import { ENTITY_METADATA, isOrbitChain, isProject } from '@/common/entities';
import { FuzzySearchResult, SearchResult } from '@/common/getSearchResults';
import { FullProject, OrbitChain, SearchableData } from '@/common/types';

type MatchIndex = { [index: number]: boolean };

/**  to check if the type is Project/Orbitchain, so that we can access images property in it */
function doesSearchResultHaveImage(
  object: any,
): object is SearchableData<FullProject | OrbitChain> {
  return 'images' in object;
}

// highlight the title or description of the search result on basis of match-details found by the algorithm
const SearchTitleAndDescriptionWithHighlight = ({
  item,
  searchResult,
}: {
  item: SearchResult;
  searchResult: FuzzySearchResult;
}) => {
  // get the match-details for title and description of the item

  const matcheDetailsForTitle = searchResult.matches?.find((match) => match.key === 'title');
  const matcheDetailsForDescription = searchResult.matches?.find(
    (match) => match.key === 'searchTitle',
  );
  return (
    <div className="flex flex-col items-start text-left">
      <div className="font-light">
        <TextWithMatchHighlight text={item.title} matchDetails={matcheDetailsForTitle} />
      </div>
      {item.searchTitle ? (
        <div className="text-xs font-light opacity-50">
          <TextWithMatchHighlight
            text={item.searchTitle}
            matchDetails={matcheDetailsForDescription}
          />
        </div>
      ) : null}
    </div>
  );
};

/** given a text, and the search-result, highlight the characters which match the search-result schema */
const TextWithMatchHighlight = ({
  text,
  matchDetails,
}: {
  text: string;
  matchDetails?: Fuse.FuseResultMatch;
}) => {
  if (!matchDetails) return <span>{text}</span>;

  /*
    go through our fuzzy-search-result object to return an object with the indexes which match the search
    */
  const bestMatchIndexes = matchDetails.indices.reduce(
    (acc: MatchIndex, [startIndex, endIndex]: [number, number]) => {
      for (let i = startIndex; i <= endIndex; i++) {
        acc[i] = true;
      }
      return acc;
    },
    {},
  ) ?? [0, 0];

  /* highlight the elements in the title between bestMatchIndexes */
  return (
    <>
      {text.split('').map((char: string, charIndex: number) => {
        return (
          <span key={charIndex} className={bestMatchIndexes[charIndex] ? 'bg-white/0' : ''}>
            {char}
          </span>
        );
      })}
    </>
  );
};

export const SearchResultsPopup = ({
  searchString,
  searchResults,
  previewLimit,
  focusIndex,
  handleSelection,
}: {
  searchString: string;
  searchResults: FuzzySearchResult[];
  previewLimit: number;
  focusIndex: number;
  handleSelection: (item: SearchResult) => void;
}) => {
  const pathname = usePathname();
  const isOnBridgePage = pathname.startsWith('/bridge');
  const noResults = searchString.length >= 2 && !searchResults.length;
  const showMoreResultsButton = searchString.length >= 2 && !noResults;

  // If on bridge page, use portal app version of search URL
  const searchUrl = isOnBridgePage
    ? `/search/${encodeURIComponent(searchString)}`
    : `/search/${searchString}`;

  return (
    <div className="absolute top-[50px] z-[100000] flex max-h-[500px] w-full flex-col items-center overflow-auto rounded-md bg-default-black py-4 text-center text-sm text-white/80 shadow-lg lg:max-w-[400px]">
      <div className="relative h-full w-full">
        {/* minimum character limit message */}
        {searchString.length < 2 && !searchResults.length ? 'Enter at least 2 characters' : null}

        {/* no results found */}
        {noResults && (
          <span>
            No results found for <q>{searchString}</q>
          </span>
        )}

        {/* finally show results */}
        {searchResults
          .filter((_, resultIndex) => resultIndex < previewLimit)
          .map((result, resultIndex) => {
            const item = result.item;

            return (
              <button
                key={item.id}
                onClick={() => handleSelection(item)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    handleSelection(item);
                  }
                }}
                className={twMerge(
                  'flex w-full items-center justify-between gap-4 border-b border-white/10 p-4',
                  focusIndex === resultIndex ? 'bg-white/10' : '',
                )}
              >
                <div className="flex items-center gap-2">
                  {/* Search result image */}
                  <div className="relative h-6 w-6 rounded-full bg-white/10">
                    {doesSearchResultHaveImage(item) && item.images?.logoUrl ? (
                      <Image alt="logo" src={item.images.logoUrl} fill className="rounded-xl" />
                    ) : (
                      // for category / subcategory with no image
                      <MagnifyingGlassIcon className="h-6 w-6 p-1" />
                    )}
                  </div>

                  {/* Title and description with highlights */}
                  <SearchTitleAndDescriptionWithHighlight item={item} searchResult={result} />
                </div>

                {/* Type Tag */}
                {isProject(item) || isOrbitChain(item) ? (
                  <div className="rounded-md bg-white/10 px-2 text-xs font-light capitalize">
                    {ENTITY_METADATA[item.entityType].title}
                  </div>
                ) : null}
              </button>
            );
          })}

        {showMoreResultsButton ? (
          <Link
            className={twMerge(
              'flex w-full flex-col items-center justify-between gap-4 border-b border-white/10 p-4',
              (focusIndex === previewLimit || focusIndex === searchResults.length) && 'bg-white/10',
            )}
            href={searchUrl}
          >
            Show all {searchResults.length > 1 ? searchResults.length : ''} results
          </Link>
        ) : null}
      </div>
    </div>
  );
};
