'use client';

import { usePathname } from 'next/navigation';
import { useAccount } from 'wagmi';

import { PageHeading } from '@/app-components/AppShell/components/PageHeading';
import { PageTabs } from '@/app-components/AppShell/components/PageTabs';
import { DialogWrapper, useDialog2 } from '@/bridge/components/common/Dialog2';
import type { TabConfig } from '@/portal/common/pageTabConfig';

const EARN_DETAIL_PAGE_REGEX = /^\/earn\/opportunity\/[^/]+\/0x[0-9a-fA-F]+$/;

const earnTabs: TabConfig[] = [
  { href: '/earn/market', label: 'Opportunities', pathMatch: '/earn/market' },
  { href: '/earn/your-holdings', label: 'Your Holdings', pathMatch: '/earn/your-holdings' },
];

export default function EarnLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [dialogProps] = useDialog2();
  const { isConnected } = useAccount();

  const isDetailPage = typeof pathname === 'string' && EARN_DETAIL_PAGE_REGEX.test(pathname);

  const showHeader = !isDetailPage;

  return (
    <div className="flex min-h-screen flex-col">
      <div className="mx-auto flex w-full flex-1 flex-col">
        {showHeader &&
          (isConnected ? (
            <PageTabs title="Earn" tabs={earnTabs} className="pt-0" />
          ) : (
            <div className="flex flex-col gap-4">
              <PageHeading>Earn</PageHeading>
            </div>
          ))}
        <div className="flex flex-1 flex-col gap-8 lg:gap-12 mt-8">{children}</div>
      </div>
      <DialogWrapper {...dialogProps} />
    </div>
  );
}
