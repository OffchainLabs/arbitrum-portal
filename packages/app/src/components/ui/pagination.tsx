'use client';

import { ArrowLeftIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import { type ButtonHTMLAttributes, type HTMLAttributes } from 'react';
import { twMerge } from 'tailwind-merge';

export function Pagination({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return <nav aria-label="Pagination" className={twMerge('w-full', className)} {...props} />;
}

export function PaginationContent({ className, ...props }: HTMLAttributes<HTMLUListElement>) {
  return (
    <ul
      className={twMerge('flex flex-row items-center justify-center gap-2', className)}
      {...props}
    />
  );
}

export function PaginationItem({ className, ...props }: HTMLAttributes<HTMLLIElement>) {
  return <li className={className} {...props} />;
}

interface PaginationLinkProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  isActive?: boolean;
}

export function PaginationLink({ className, isActive, ...props }: PaginationLinkProps) {
  return (
    <button
      type="button"
      className={twMerge(
        'px-2 py-1 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-30',
        isActive ? 'text-white' : 'text-white/50 hover:text-white/70',
        className,
      )}
      aria-current={isActive ? 'page' : undefined}
      {...props}
    />
  );
}

export function PaginationPrevious(props: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      aria-label="Go to previous page"
      className="flex items-center justify-center transition-opacity disabled:cursor-not-allowed disabled:opacity-30"
      {...props}
    >
      <ArrowLeftIcon className="h-4 w-4 text-white" />
    </button>
  );
}

export function PaginationNext(props: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      aria-label="Go to next page"
      className="flex items-center justify-center transition-opacity disabled:cursor-not-allowed disabled:opacity-30"
      {...props}
    >
      <ArrowRightIcon className="h-4 w-4 text-white" />
    </button>
  );
}

export function PaginationEllipsis({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span aria-hidden className={twMerge('px-2 text-white/50', className)} {...props}>
      ...
    </span>
  );
}
