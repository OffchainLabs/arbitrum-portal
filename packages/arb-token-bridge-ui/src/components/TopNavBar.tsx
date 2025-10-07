import { Tab, TabList } from '@headlessui/react';
import { PaperAirplaneIcon, WalletIcon } from '@heroicons/react/24/outline';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import React, { PropsWithChildren, useMemo } from 'react';
import { twMerge } from 'tailwind-merge';

import { PathnameEnum } from '../constants';
import { useArbQueryParams } from '../hooks/useArbQueryParams';
import { useMode } from '../hooks/useMode';
import { isBridgeBuyOrSubpages } from '../util/pathnameUtils';
import { TabParamEnum, isOnrampFeatureEnabled } from '../util/queryParamUtils';
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
  const isBuyTab = isBridgeBuyOrSubpages(pathname);
  const { embedMode } = useMode();

  return (
    <Tab
      as={Link}
      href={
        href ?? {
          pathname: embedMode ? PathnameEnum.EMBED : PathnameEnum.BRIDGE,
          query: hrefQuery,
        }
      }
      className={twMerge(
        'flex h-full items-center justify-center gap-2 rounded p-1 text-sm lg:text-lg',
        !isBuyTab && 'ui-selected:bg-black/75',
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
  const [{ disabledFeatures }] = useArbQueryParams();
  const showBuyPanel = isOnrampFeatureEnabled({ disabledFeatures });
  const { embedMode } = useMode();
  const pathname = usePathname();
  const isBuyTab = isBridgeBuyOrSubpages(pathname);
  const searchParams = useSearchParams();

  const searchParamsWithoutTab = useMemo(() => {
    const { tab, ...rest } = Object.fromEntries(searchParams.entries());
    return new URLSearchParams(rest);
  }, [searchParams]);

  return (
    <TabList
      className={twMerge(
        'grid w-full max-w-[580px] bg-white/20 p-[8px] text-white md:rounded',
        showBuyPanel ? 'grid-cols-3' : 'grid-cols-2',
      )}
    >
      {showBuyPanel && (
        <StyledTab
          href={{
            pathname: embedMode ? PathnameEnum.EMBED_BUY : PathnameEnum.BUY,
            query: searchParamsWithoutTab.toString(),
          }}
          className={isBuyTab ? 'bg-black/75' : ''}
          aria-label="Switch to Buy Tab"
        >
          <WalletIcon className="h-3 w-3" />
          Buy
        </StyledTab>
      )}
      <StyledTab aria-label="Switch to Bridge Tab" hrefQuery={searchParamsWithoutTab.toString()}>
        <PaperAirplaneIcon className="h-3 w-3" />
        Bridge
      </StyledTab>
      <StyledTab
        aria-label="Switch to Transaction History Tab"
        hrefQuery={`${searchParamsWithoutTab.toString()}&tab=${TabParamEnum.TX_HISTORY}`}
      >
        <Image src="/icons/history.svg" width={24} height={24} alt="history icon" />
        Txn History{' '}
        <span className={twMerge('h-4 w-4 shrink-0 rounded-full', colorClassName.light)} />
      </StyledTab>
    </TabList>
  );
}
