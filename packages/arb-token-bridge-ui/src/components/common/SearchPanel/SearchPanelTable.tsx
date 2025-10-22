import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import React, { PropsWithChildren, useEffect } from 'react';
import { twMerge } from 'tailwind-merge';

import { useMode } from '../../../hooks/useMode';

type SearchPanelTableProps = {
  searchInputPlaceholder: string;
  searchInputValue: string;
  searchInputOnChange: React.ChangeEventHandler<HTMLInputElement>;
  SearchInputButton?: React.JSX.Element;
  onSubmit?: React.FormEventHandler<HTMLFormElement>;
  errorMessage: string;
  dataCy?: string;
  isDialog: boolean;
  showSearch: boolean;
};

export const SearchPanelTable = ({
  searchInputPlaceholder,
  searchInputValue,
  searchInputOnChange,
  SearchInputButton,
  onSubmit = (event) => {
    event.preventDefault();
  },
  errorMessage,
  children,
  dataCy,
  isDialog,
  showSearch,
}: PropsWithChildren<SearchPanelTableProps>) => {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const { embedMode } = useMode();

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [inputRef]);

  return (
    <div className="flex w-[calc(100vw_-_60px)] flex-col gap-3 md:w-full">
      {showSearch && (
        <form onSubmit={onSubmit} className="flex flex-col">
          <div className="flex items-stretch gap-2">
            <div className="relative flex h-full w-full grow items-center rounded bg-black/50 text-white shadow-input">
              <MagnifyingGlassIcon className="absolute left-3 top-[11px] h-3 w-3 shrink-0" />
              <input
                ref={inputRef}
                type="search"
                placeholder={searchInputPlaceholder}
                value={searchInputValue}
                onChange={searchInputOnChange}
                className="h-full w-full rounded bg-transparent py-2 pl-8 pr-2 text-sm font-light placeholder:text-sm placeholder:text-white"
              />
            </div>
            {SearchInputButton}
          </div>
          {!!errorMessage && <p className="text-xs text-red-400">{errorMessage}</p>}
        </form>
      )}
      <div
        className={twMerge(
          'sm:shadow-search-panel h-[calc(100vh_-_200px)] rounded',
          isDialog ? 'md:max-h-[700px]' : 'md:max-h-[400px]',
          embedMode ? 'h-[calc(100vh_-_150px)]' : 'md:h-[calc(100vh_-_390px)] min-h-[180px]',
        )}
        data-cy={dataCy}
      >
        {children}
      </div>
    </div>
  );
};
