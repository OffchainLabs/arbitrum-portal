'use client';

import React from 'react';
import { twMerge } from 'tailwind-merge';

export function ExternalLink({
  children,
  className,
  onClick = () => {},
  ...props
}: React.AnchorHTMLAttributes<HTMLAnchorElement>) {
  function onClickHandler(event: React.MouseEvent<HTMLAnchorElement>) {
    event.stopPropagation();
    event.nativeEvent.stopImmediatePropagation();
    onClick(event);
  }

  return (
    <a
      target="_blank"
      rel="noopener noreferrer"
      className={twMerge('hover:no-underline', className)}
      onClick={onClickHandler}
      {...props}
    >
      {children}
    </a>
  );
}
