'use client';

import { Filter, Search, SlidersHorizontal } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const tabs = [
  { name: 'Your Positions', href: '/earn/opportunities/my' },
  { name: 'New Opportunities', href: '/earn/opportunities' },
  { name: 'Tutorials & Education', href: '/earn/learn' },
];

export default function EarnLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const isActiveTab = (href: string) => {
    if (href === '/earn/opportunities/my') {
      return pathname === '/earn/opportunities/my';
    }
    if (href === '/earn/opportunities') {
      return pathname === '/earn/opportunities';
    }
    return pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-[1440px] px-8 py-[66px]">
        {/* Page Header */}
        <h1 className="mb-8 text-[30px] font-bold leading-[30px]">Earn</h1>

        {/* Navigation Tabs */}
        <div className="mb-[34px] flex items-center justify-between">
          <div className="flex gap-2">
            {tabs.map((tab) => (
              <Link
                key={tab.href}
                href={tab.href}
                className={`h-[42px] rounded-lg px-6 py-4 text-xs font-medium leading-[10px] transition-colors ${
                  isActiveTab(tab.href)
                    ? 'bg-[#262626] text-white'
                    : 'bg-transparent text-[#999999] hover:bg-[#1a1a1a] hover:text-white'
                }`}
              >
                {tab.name}
              </Link>
            ))}
          </div>

          {/* Action Buttons - Only show on opportunities tabs */}
          {(pathname === '/earn/opportunities/my' ||
            pathname === '/earn/opportunities') && (
            <div className="flex gap-2">
              <button className="flex h-[42px] w-[42px] items-center justify-center rounded-lg bg-[#262626] transition-colors hover:bg-[#2b2b2b]">
                <Search className="h-[22px] w-[22px]" />
              </button>
              <button className="flex h-[42px] w-[42px] items-center justify-center rounded-lg bg-[#262626] transition-colors hover:bg-[#2b2b2b]">
                <SlidersHorizontal className="h-4 w-4" />
              </button>
              <button className="flex h-[42px] w-[42px] items-center justify-center rounded-lg bg-[#262626] transition-colors hover:bg-[#2b2b2b]">
                <Filter className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        {/* Page Content */}
        {children}
      </div>
    </div>
  );
}
