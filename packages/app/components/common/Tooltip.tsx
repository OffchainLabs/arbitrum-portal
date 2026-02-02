'use client';

import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import * as React from 'react';
import { twMerge } from 'tailwind-merge';

export type TooltipProps = {
  show?: boolean;
  children: React.ReactNode;
  content?: React.ReactNode;
  wrapperClassName?: string;
  tooltipProps?: React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Root>;
  contentProps?: React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>;
};

export const TooltipProvider = TooltipPrimitive.Provider;

export function Tooltip({
  show = true,
  content,
  wrapperClassName = 'w-max',
  tooltipProps,
  contentProps,
  children,
}: TooltipProps): React.JSX.Element | null {
  if (!content) {
    return null;
  }

  if (!show) {
    return <>{children}</>;
  }

  return (
    <TooltipPrimitive.Root {...tooltipProps}>
      <TooltipPrimitive.Trigger asChild>
        <div className={wrapperClassName}>{children}</div>
      </TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          sideOffset={4}
          {...contentProps}
          className={twMerge(
            'tooltip-animated z-50 bg-gray-8 overflow-hidden rounded-[5px] px-2 py-1 text-sm leading-5 border border-[#777]',
            contentProps?.className,
          )}
        >
          {content}
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}
