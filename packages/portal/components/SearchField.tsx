import { twMerge } from 'tailwind-merge';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import React, { forwardRef } from 'react';

export type SearchFieldProps = React.InputHTMLAttributes<HTMLInputElement> & {
  wrapperClassName: string;
};

export const SearchField = forwardRef<HTMLInputElement, SearchFieldProps>(
  function SearchField({ className, wrapperClassName, ...rest }, ref) {
    return (
      <div
        className={twMerge(
          'flex h-full items-center rounded-lg border border-gray-50 bg-white pl-3 pr-4 lg:rounded-full',
          wrapperClassName,
        )}
      >
        <MagnifyingGlassIcon className="h-5 w-5 stroke-default-black stroke-2" />
        <input
          ref={ref}
          className={twMerge(
            'h-full w-full py-[11px] pl-1 leading-7 text-default-black placeholder:text-gray-750 lg:py-[7px]',
            className,
          )}
          type="search"
          {...rest}
        />
      </div>
    );
  },
);
