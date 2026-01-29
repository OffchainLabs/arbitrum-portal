'use client';

import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { usePathname, useRouter } from 'next/navigation';
import { usePostHog } from 'posthog-js/react';
import { useEffect, useRef, useState } from 'react';
import { twMerge } from 'tailwind-merge';

import { SearchResult } from '@/portal/common/getSearchResults';
import { SearchResultsPopup } from '@/portal/components/SearchResultsPopup';
import { useSearch } from '@/portal/hooks/useSearch';

import { shouldExpandSearchOnMobile } from '../config/navConfig';

const PREVIEW_LIMIT = 5;

// Expandable search component - starts as icon button, expands to input when clicked/focused
// On mobile: expanded on Projects/Chains/My Apps pages, collapsed elsewhere
export function NavSearch() {
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
  const inputRef = useRef<HTMLInputElement>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [focusIndex, setFocusIndex] = useState<number>(-1);
  const [isMobile, setIsMobile] = useState(false);

  // On mobile, check if search should be expanded by default
  const shouldExpandOnMobile = shouldExpandSearchOnMobile(pathname);

  const showSearchResultsPopup = isSearchPage ? searchString !== searchStringInUrl : searchString;

  const pageSize = Math.min(searchResults.length + 1, PREVIEW_LIMIT + 1);

  // Detect mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768); // md breakpoint
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Expand when search string has value
  // On mobile: also expand if on Projects/Chains/My Apps pages
  useEffect(() => {
    if (searchString) {
      setIsExpanded(true);
    } else if (isMobile && shouldExpandOnMobile) {
      setIsExpanded(true);
    } else if (isMobile && !shouldExpandOnMobile && !searchString) {
      // On mobile non-search pages, collapse if search string is empty
      setIsExpanded(false);
    }
  }, [searchString, isMobile, shouldExpandOnMobile]);

  // Focus input when expanded
  useEffect(() => {
    if (isExpanded && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isExpanded]);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchString(event.target.value);
  };

  const handleFocus = () => {
    setIsExpanded(true);
  };

  const handleBlur = () => {
    // Use setTimeout to allow click events on popup to register first
    setTimeout(() => {
      // Check if focus moved to popup or input
      const activeElement = document.activeElement;
      if (activeElement?.closest('[data-search-popup]') || activeElement === inputRef.current) {
        return;
      }

      // On mobile: keep expanded if on Projects/Chains/My Apps pages
      if (isMobile && shouldExpandOnMobile) {
        return;
      }

      // Collapse only if search string is empty
      if (!searchString) {
        setIsExpanded(false);
      }
    }, 200);
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
      e.preventDefault();
      setFocusIndex(focusIndex === pageSize - 1 ? -1 : focusIndex + 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusIndex(focusIndex === -1 ? pageSize - 1 : focusIndex - 1);
    } else if (e.key === 'Enter') {
      if (focusIndex >= pageSize - 1 || focusIndex === -1) {
        handleShowAllResults();
      } else if (searchResults[focusIndex]) {
        handleSelection(searchResults[focusIndex].item);
      }
    } else if (e.key === 'Escape' && !isSearchPage) {
      setSearchString('');
      setIsExpanded(false);
      inputRef.current?.blur();
    }
  };

  useEffect(() => {
    setFocusIndex(-1);
  }, [searchResults]);

  const handleSelection = (item: SearchResult): void => {
    captureInputAnalytics();
    handleSearchResultSelection(item, () => {
      setSearchString('');
      setIsExpanded(false);
    });
  };

  const handleShowAllResults = () => {
    captureInputAnalytics();
    router.push(`/search/${searchString}`, { scroll: true });
  };

  return (
    <div className={twMerge('relative', isExpanded ? 'w-full md:w-auto' : 'w-auto md:w-auto')}>
      {/* Search container - expands/contracts with animation */}
      <div
        className={twMerge(
          'flex items-center gap-2 rounded-md bg-gray-8 transition-all duration-300 ease-in-out h-[40px]',
          isExpanded
            ? 'w-full md:w-[400px] border-0 px-3 py-0' // Full width on mobile when expanded
            : 'h-10 w-10 cursor-pointer items-center justify-center border-0 p-0 hover:bg-gray-8/80',
        )}
        onClick={() => !isExpanded && setIsExpanded(true)}
      >
        <MagnifyingGlassIcon className="h-4 w-4 shrink-0 text-white" />
        {isExpanded && (
          <input
            ref={inputRef}
            type="text"
            className="h-full w-full bg-transparent text-sm text-white placeholder-white/50 outline-none focus:outline-none focus:ring-0 focus:ring-offset-0"
            placeholder="Search projects, chains, and more"
            value={searchString}
            onChange={handleInputChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            style={{ outline: 'none', boxShadow: 'none' }}
          />
        )}
      </div>

      {/* Search results popup */}
      {showSearchResultsPopup && isExpanded && (
        <div
          data-search-popup
          className="absolute left-0 top-full z-[100000] mt-2 w-full md:w-full lg:w-[400px]"
        >
          <SearchResultsPopup
            searchString={searchString}
            searchResults={searchResults}
            previewLimit={PREVIEW_LIMIT}
            focusIndex={focusIndex}
            handleSelection={handleSelection}
          />
        </div>
      )}
    </div>
  );
}
