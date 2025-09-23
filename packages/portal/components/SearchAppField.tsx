import { forwardRef, useState } from 'react';
import { usePostHog } from 'posthog-js/react';
import { useDebounce } from 'react-use';

import { SearchField, SearchFieldProps } from './SearchField';
import { useArbQueryParams } from '@/hooks/useArbQueryParams';

export const SearchAppField = forwardRef<HTMLInputElement, SearchFieldProps>(
  function SearchAppField({ placeholder, wrapperClassName }, ref) {
    const [{ search }, setQueryParams] = useArbQueryParams();
    const [searchString, setSearchString] = useState<string>(search);

    useDebounce(
      () => {
        // once `searchString` changes, wait for 200ms before calling `setQueryParams`
        setQueryParams({ search: searchString });
      },
      200,
      [searchString],
    );

    const posthog = usePostHog();

    function sendSearchAppFieldClickEvent() {
      posthog?.capture('Search Field Click');
    }

    const onChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      setSearchString(event.target.value);
    };

    return (
      <SearchField
        ref={ref}
        wrapperClassName={wrapperClassName}
        placeholder={placeholder}
        value={searchString}
        onClick={sendSearchAppFieldClickEvent}
        onChange={onChange}
      />
    );
  },
);
