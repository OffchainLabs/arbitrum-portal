import { Tab, TabList } from '@headlessui/react'
import { PaperAirplaneIcon, WalletIcon } from '@heroicons/react/24/outline'
import React, { PropsWithChildren } from 'react'
import { twMerge } from 'tailwind-merge'
import Image from 'next/image'
import { useTransactionReminderInfo } from './TransactionHistory/useTransactionReminderInfo'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'

import { BUY_EMBED_PATHNAME, BUY_PATHNAME } from '../constants'
import { useMode } from '../hooks/useMode'
import { isOnrampEnabled } from '../util/featureFlag'

function StyledTab({ children, ...props }: PropsWithChildren) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const isBuyTab = pathname === BUY_PATHNAME
  const { embedMode } = useMode()

  return (
    <Tab
      as={Link}
      href={{
        pathname: embedMode ? '/bridge/embed' : '/bridge',
        query: Object.fromEntries(searchParams.entries())
      }}
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
  const showBuyPanel = isOnrampEnabled();
  const pathname = usePathname()
  const isBuyTab = pathname === BUY_PATHNAME
  const { embedMode } = useMode()

  return (
    <div
      className={twMerge(
        'grid w-full max-w-[600px] bg-white/20 p-[8px] text-white md:rounded',
        showBuyPanel ? 'grid-cols-3' : 'grid-cols-2',
      )}
    >
      {showBuyPanel && (
        <Link
          href={embedMode ? BUY_EMBED_PATHNAME : BUY_PATHNAME}
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
        <StyledTab aria-label="Switch to Bridge Tab">
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
