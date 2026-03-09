'use client';

import Tippy, { type TippyProps } from '@tippyjs/react';
import { ReactNode } from 'react';
import { twMerge } from 'tailwind-merge';

export type TooltipProps = {
  show?: boolean;
  children: ReactNode;
  content?: ReactNode;
  wrapperClassName?: string;
  tippyProps?: TippyProps;
  theme?: 'light' | 'dark';
};

export function Tooltip({
  show = true,
  content,
  wrapperClassName,
  theme = 'dark',
  tippyProps = {},
  children,
}: TooltipProps): JSX.Element | null {
  if (!content) {
    return null;
  }

  if (!show) {
    return <>{children}</>;
  }

  return (
    <Tippy {...tippyProps} theme={theme} content={content} arrow={false}>
      <span className={twMerge(wrapperClassName)}>{children}</span>
    </Tippy>
  );
}
