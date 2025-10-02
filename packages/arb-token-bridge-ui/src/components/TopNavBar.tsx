import { Tab, TabList } from '@headlessui/react';
import { PaperAirplaneIcon, WalletIcon } from '@heroicons/react/24/outline';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import React, { PropsWithChildren, useMemo } from 'react';
import { twMerge } from 'tailwind-merge';

import { BRIDGE_PATHNAME, BUY_EMBED_PATHNAME, BUY_PATHNAME, EMBED_PATHNAME } from '../constants';
import { useMode } from '../hooks/useMode';
import { isOnrampEnabled } from '../util/featureFlag';
import { TabParamEnum } from '../util/queryParamUtils';
import { useTransactionReminderInfo } from './TransactionHistory/useTransactionReminderInfo';

function StyledTab({
  children,
  className,
  href,
  hrefQuery,
  ...props
}: Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> &
  PropsWithChildren<{
    href?: { pathname: string; query: string };
    hrefQuery?: string;
  }>) {
  const pathname = usePathname();
  const isBuyTab = pathname === BUY_PATHNAME;
  const searchParams = useSearchParams();
  const { embedMode } = useMode();

  const searchParamsWithoutTab = useMemo(() => {
    const { tab, ...rest } = Object.fromEntries(searchParams.entries());
    return new URLSearchParams(rest);
  }, [searchParams]);

  return (
    <Tab
      as={Link}
      href={
        href ?? {
          pathname: embedMode ? EMBED_PATHNAME : BRIDGE_PATHNAME,
          query: `${searchParamsWithoutTab.toString()}${hrefQuery}`,
        }
      }
      className={twMerge(
        'flex h-full items-center justify-center gap-2 rounded p-1 text-sm lg:text-lg',
        isBuyTab ? 'bg-black/75' : 'ui-selected:bg-black/75',
        className,
      )}
      {...props}
    >
      {children}
    </Tab>
  );
}

StyledTab.displayName = 'StyledTab';

export function TopNavBar() {
  const { colorClassName } = useTransactionReminderInfo();
  const showBuyPanel = isOnrampEnabled();
  const { embedMode } = useMode();

  return (
    <TabList
      className={twMerge(
        'grid w-full max-w-[600px] bg-white/20 p-[8px] text-white md:rounded',
        showBuyPanel ? 'grid-cols-3' : 'grid-cols-2',
      )}
    >
      {showBuyPanel && (
        <StyledTab
          href={{
            pathname: embedMode ? BUY_EMBED_PATHNAME : BUY_PATHNAME,
            query: '',
          }}
          aria-label="Switch to Buy Tab"
        >
          <WalletIcon className="h-3 w-3" />
          Buy
        </StyledTab>
      )}
      <StyledTab aria-label="Switch to Bridge Tab" hrefQuery={`&tab=${TabParamEnum.BRIDGE}`}>
        <PaperAirplaneIcon className="h-3 w-3" />
        Bridge
      </StyledTab>
      <StyledTab
        aria-label="Switch to Transaction History Tab"
        hrefQuery={`&tab=${TabParamEnum.TX_HISTORY}`}
      >
        <Image src="/icons/history.svg" width={24} height={24} alt="history icon" />
        Txn History{' '}
        <span className={twMerge('h-3 w-3 shrink-0 rounded-full', colorClassName.light)} />
      </StyledTab>
    </TabList>
  );
}
