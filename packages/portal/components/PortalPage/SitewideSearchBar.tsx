'use client';

import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { usePathname, useRouter } from 'next/navigation';
import { usePostHog } from 'posthog-js/react';
import { useEffect, useState } from 'react';
import { twMerge } from 'tailwind-merge';

import { SearchResult } from '@/common/getSearchResults';
import { SearchResultsPopup } from '@/components/SearchResultsPopup';
import { useSearch } from '@/hooks/useSearch';

const PREVIEW_LIMIT = 5; // after this limit, we show "Show all <results> button" to link to search page

export const SitewideSearchBar = () => {
  const router = useRouter();
  const pathname = usePathname();
  const {
    searchString,
    searchResults,
    setSearchString,
    isSearchPage,
    handleSearchResultSelection,
    searchStringInUrl,
  } = useSearch();
  const posthog = usePostHog();

  /**
   * The `focusIndex` is used to keep track of the currently focused search result. It can have the following values:
   * `focusIndex` = -1 means no focus (default), on pressing enter, we go to search page
   * `focusIndex` < PREVIEW_LIMIT means focus on the search result, on enter we show the entity
   * `focusIndex` = PREVIEW_LIMIT means focus on "Show all" button, on enter we go to search page
   *
   *  incrementing/decrementing `focusIndex` will loop through the values mentioned above.
   */

  const [focusIndex, setFocusIndex] = useState<number>(-1);

  const showSeachResultsPopup = isSearchPage
    ? searchString !== searchStringInUrl // don't show popup if search string is same as in URL
    : searchString;

  const pageSize = Math.min(searchResults.length + 1, PREVIEW_LIMIT + 1);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchString(event.target.value);
  };

  const captureInputAnalytics = () => {
    if (searchString.length) {
      posthog?.capture('Search Queries', {
        Input: searchString,
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!searchResults.length) return;

    if (e.key === 'Tab' || e.key === 'ArrowDown') {
      // Tab or Down arrow
      e.preventDefault();
      setFocusIndex(focusIndex === pageSize - 1 ? -1 : focusIndex + 1);
    } else if (e.key === 'ArrowUp') {
      // Up arrow
      e.preventDefault();
      setFocusIndex(focusIndex === -1 ? pageSize - 1 : focusIndex - 1);
    } else if (e.key === 'Enter') {
      if (focusIndex >= pageSize - 1 || focusIndex === -1) {
        // Enter is pressed on `Show all` button
        handleShowAllResults();
      } else if (searchResults[focusIndex]) {
        // Select the option
        handleSelection(searchResults[focusIndex].item);
      }
    } else if (e.key === 'Escape' && !isSearchPage) {
      // in case of Esc, clear search which will close popup
      setSearchString('');
    }
  };

  useEffect(() => {
    const updateNavStyling = () => {
      const scrollDownThreshold = 50;
      const stickyNav = document.getElementById('sticky-top-bar');
      if (
        document.body.scrollTop > scrollDownThreshold ||
        document.documentElement.scrollTop > scrollDownThreshold
      ) {
        stickyNav?.classList.add('bg-black/80');
      } else {
        stickyNav?.classList.remove('bg-black/80');
      }
    };

    // on first render, check scroll position and apply styling
    updateNavStyling();

    // update the nav styling acc to the scroll as well
    document.addEventListener('scroll', updateNavStyling);

    // detach the event listener on unmount
    return () => document.removeEventListener('scroll', updateNavStyling);
  }, []);

  useEffect(() => {
    setFocusIndex(-1);
  }, [searchResults]);

  const handleSelection = (item: SearchResult): void => {
    // capture the input analytics
    captureInputAnalytics();

    handleSearchResultSelection(item, () => {
      // close the search after this
      setSearchString('');
    });
  };

  const handleShowAllResults = () => {
    // capture the input analytics
    captureInputAnalytics();

    // If user is on bridge page, redirect to portal app version of search
    const isOnBridgePage = pathname.startsWith('/bridge');
    if (isOnBridgePage) {
      // Redirect to portal app version (remove /bridge prefix)
      router.push(`/search/${encodeURIComponent(searchString)}`, { scroll: true });
    } else {
      router.push(`/search/${searchString}`, { scroll: true });
    }
  };

  return (
    <div className="relative w-full">
      {/* Input field */}
      <div
        className={twMerge(
          'group flex h-[40px] w-full flex-nowrap items-center gap-[5px] rounded-md border-[1px] border-dark-gray bg-black px-[10px] transition-colors duration-300 lg:w-[400px]',
          searchString && 'bg-white text-default-black',
        )}
      >
        <MagnifyingGlassIcon className="h-4 w-4 shrink-0 grow-0" />
        <input
          className="h-full w-full grow border-transparent bg-transparent font-light outline-none outline-0"
          placeholder="Search projects, chains, and more"
          value={searchString}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
        />
      </div>

      {/* Search results popup */}
      {showSeachResultsPopup && (
        <SearchResultsPopup
          searchString={searchString}
          searchResults={searchResults}
          previewLimit={PREVIEW_LIMIT}
          focusIndex={focusIndex}
          handleSelection={handleSelection}
        />
      )}
    </div>
  );
};
