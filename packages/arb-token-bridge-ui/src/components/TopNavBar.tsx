import { Tab } from '@headlessui/react'
import { PaperAirplaneIcon, WalletIcon } from '@heroicons/react/24/outline'
import { PropsWithChildren } from 'react'
import { twMerge } from 'tailwind-merge'
import Image from 'next/image'
import { useTransactionReminderInfo } from './TransactionHistory/useTransactionReminderInfo'
import { isOnrampEnabled } from '../util/featureFlag'

function StyledTab({ children, ...props }: PropsWithChildren) {
  return (
    <Tab
      className="ui-selected:bg-black/75 flex h-full items-center justify-center gap-2 rounded p-1 text-sm lg:text-lg"
      {...props}
    >
      {children}
    </Tab>
  )
}

StyledTab.displayName = 'StyledTab'

export function TopNavBar() {
  const { colorClassName } = useTransactionReminderInfo()
  const showBuyPanel = isOnrampEnabled()

  return (
    <Tab.List
      className={twMerge(
        'grid w-full max-w-[600px] bg-white/20 p-[8px] text-white md:rounded',
        showBuyPanel ? 'grid-cols-3' : 'grid-cols-2'
      )}
    >
      {showBuyPanel && (
        <StyledTab aria-label="Switch to Buy Tab">
          <WalletIcon className="h-3 w-3" />
          Buy
        </StyledTab>
      )}
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
    </Tab.List>
  )
}
