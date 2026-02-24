'use client';

import * as RadixTooltip from '@radix-ui/react-tooltip';
import { ReactNode } from 'react';
import { twMerge } from 'tailwind-merge';

type TooltipVariant = 'dark' | 'light' | 'orange';

const contentClassNamesByVariant: Record<TooltipVariant, string> = {
  dark: 'border border-[#777] bg-black text-white',
  light: 'border border-[#777] bg-white text-black',
  orange: 'bg-[#FFEED3] text-[#60461F]',
};

export type TooltipProps = {
  show?: boolean;
  children: ReactNode;
  content?: ReactNode;
  wrapperClassName?: string;
  contentClassName?: string;
  variant?: TooltipVariant;
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
  variant = 'dark',
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
              'z-[80] rounded-lg px-3 py-2 text-xs leading-5 shadow-tooltip',
              contentClassNamesByVariant[variant],
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
