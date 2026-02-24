'use client';

import * as RadixTooltip from '@radix-ui/react-tooltip';
import { ReactElement, ReactNode } from 'react';
import { twMerge } from 'tailwind-merge';

export type TooltipProps = {
  show?: boolean;
  children: ReactElement;
  content?: ReactNode;
  contentClassName?: string;
  side?: 'top' | 'right' | 'bottom' | 'left';
  align?: 'start' | 'center' | 'end';
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onClickOutside?: () => void;
};

export function Tooltip({
  show = true,
  content,
  contentClassName,
  side = 'top',
  align = 'center',
  open,
  onOpenChange,
  onClickOutside,
  children,
}: TooltipProps): JSX.Element {
  if (!show || !content) {
    return <>{children}</>;
  }

  return (
    <RadixTooltip.Provider delayDuration={120}>
      <RadixTooltip.Root open={open} onOpenChange={onOpenChange}>
        <RadixTooltip.Trigger asChild>{children}</RadixTooltip.Trigger>

        <RadixTooltip.Portal>
          <RadixTooltip.Content
            side={side}
            align={align}
            sideOffset={8}
            onPointerDownOutside={onClickOutside}
            className={twMerge(
              'z-[1001] w-max max-w-[350px] p-2 bg-neutral-100 border border-neutral-200 rounded-sm text-xs text-white',
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
