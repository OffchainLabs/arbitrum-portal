'use client';

import * as RadixTooltip from '@radix-ui/react-tooltip';
import { ReactNode } from 'react';
import { twMerge } from 'tailwind-merge';

export type TooltipProps = {
  show?: boolean;
  children: ReactNode;
  content?: ReactNode;
  wrapperClassName?: string;
  contentClassName?: string;
  side?: 'top' | 'right' | 'bottom' | 'left';
  align?: 'start' | 'center' | 'end';
  sideOffset?: number;
  delayDuration?: number;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onClickOutside?: () => void;
  disableHoverableContent?: boolean;
};

export function Tooltip({
  show = true,
  content,
  wrapperClassName = 'w-max',
  contentClassName,
  side = 'top',
  align = 'center',
  sideOffset = 8,
  delayDuration = 120,
  open,
  onOpenChange,
  onClickOutside,
  disableHoverableContent = false,
  children,
}: TooltipProps): JSX.Element {
  if (!show || !content) {
    return <>{children}</>;
  }

  return (
    <RadixTooltip.Provider delayDuration={delayDuration}>
      <RadixTooltip.Root
        open={open}
        onOpenChange={onOpenChange}
        disableHoverableContent={disableHoverableContent}
      >
        <RadixTooltip.Trigger asChild>
          <div className={wrapperClassName}>{children}</div>
        </RadixTooltip.Trigger>

        <RadixTooltip.Portal>
          <RadixTooltip.Content
            side={side}
            align={align}
            sideOffset={sideOffset}
            onPointerDownOutside={onClickOutside}
            className={twMerge(
              'z-[1001] p-2 bg-neutral-100 border border-neutral-200 rounded-sm text-xs text-white',
              contentClassName,
            )}
          >
            {content}
          </RadixTooltip.Content>
        </RadixTooltip.Portal>
      </RadixTooltip.Root>
    </RadixTooltip.Provider>
  );
}
