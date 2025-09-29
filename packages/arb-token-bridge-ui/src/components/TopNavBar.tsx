import { Tab, TabList } from '@headlessui/react';
import { PaperAirplaneIcon, WalletIcon } from '@heroicons/react/24/outline';
import Image from 'next/image';
import React from 'react';
import { twMerge } from 'tailwind-merge';

import { isOnrampEnabled } from '../util/featureFlag';
import { useTransactionReminderInfo } from './TransactionHistory/useTransactionReminderInfo';
import { useArbQueryParams } from '../hooks/useArbQueryParams';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { BUY_PATHNAME } from '../constants';
import { useMode } from '../hooks/useMode';

function StyledTab({
  children,
  href,
  ...props
}: React.AnchorHTMLAttributes<HTMLAnchorElement> &
  React.HTMLAttributes<HTMLAnchorElement>) {
  const pathname = usePathname()
  const isBuyTab = pathname === BUY_PATHNAME
  const { embedMode } = useMode()

  return (
    <Tab
      as={Link}
      href={href ?? '/bridge'}
      className={twMerge(
        'flex h-full items-center justify-center gap-2 rounded p-1 text-sm lg:text-lg',
        isBuyTab ? '' : 'ui-selected:bg-black/75'
      )}
      {...props}
    >
      {children}
    </Tab>
  );
}

StyledTab.displayName = 'StyledTab';

export function TopNavBar() {
  const { colorClassName } = useTransactionReminderInfo()
  const [{ disabledFeatures }] = useArbQueryParams()
  const showBuyPanel = isOnrampEnabled();
  const pathname = usePathname()
  const isBuyTab = pathname === BUY_PATHNAME

  return (
    <div
      className={twMerge(
        'grid w-full max-w-[600px] bg-white/20 p-[8px] text-white md:rounded',
        showBuyPanel ? 'grid-cols-3' : 'grid-cols-2',
      )}
    >
      {showBuyPanel && (
        <Link
          href={BUY_PATHNAME}
          className={twMerge(
            'flex h-full items-center justify-center gap-2 rounded p-1 text-sm lg:text-lg',
            isBuyTab && 'bg-black/75'
          )}
          aria-label="Switch to Buy Tab"
        >
          <WalletIcon className="h-3 w-3" />
          Buy
        </Link>
      )}
      <TabList className={twMerge('col-span-2 grid grid-cols-2')}>
        <StyledTab aria-label="Switch to Bridge Tab" href="/bridge">
          <PaperAirplaneIcon className="h-3 w-3" />
          Bridge
        </StyledTab>
        <StyledTab aria-label="Switch to Transaction History Tab">
          <Image
            src="/icons/history.svg"
            width={24}
            height={24}
            alt="history icon"
          />
          Txn History{' '}
          <span
            className={twMerge(
              'h-3 w-3 shrink-0 rounded-full',
              colorClassName.light
            )}
          />
        </StyledTab>
      </TabList>
    </div>
  )
}
