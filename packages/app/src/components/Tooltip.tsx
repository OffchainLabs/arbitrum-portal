'use client';

import * as RadixTooltip from '@radix-ui/react-tooltip';
import { Fragment, ReactElement, ReactNode, cloneElement, isValidElement } from 'react';
import { twMerge } from 'tailwind-merge';

export type TooltipProps = {
  show?: boolean;
  children: ReactNode;
  content?: ReactNode;
  wrapperClassName?: string;
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
  wrapperClassName = 'w-max',
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

  const trigger = isValidElement(children) && children.type !== Fragment
    ? cloneElement(children as ReactElement<{ className?: string }>, {
        className: twMerge(wrapperClassName, children.props.className),
      })
    : typeof children === 'string' || typeof children === 'number'
      ? <span className={wrapperClassName}>{children}</span>
      : <div className={wrapperClassName}>{children}</div>;

  return (
    <RadixTooltip.Provider delayDuration={120}>
      <RadixTooltip.Root open={open} onOpenChange={onOpenChange}>
        <RadixTooltip.Trigger asChild>{trigger}</RadixTooltip.Trigger>

        <RadixTooltip.Portal>
          <RadixTooltip.Content
            side={side}
            align={align}
            sideOffset={8}
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
