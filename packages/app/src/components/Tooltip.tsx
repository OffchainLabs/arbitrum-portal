'use client';

import Tippy, { type TippyProps } from '@tippyjs/react';
import { ReactNode } from 'react';
import { twMerge } from 'tailwind-merge';

export type TooltipProps = {
  show?: boolean;
  children: ReactNode;
  content?: ReactNode;
  as?: 'div' | 'span';
  wrapperClassName?: string;
  tippyProps?: TippyProps;
  theme?: 'light' | 'dark';
};

export function Tooltip({
  show = true,
  content,
  as: Wrapper = 'div',
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
      <Wrapper className={twMerge(wrapperClassName)}>{children}</Wrapper>
    </Tippy>
  );
}
