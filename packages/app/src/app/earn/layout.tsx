'use client';

import { Button } from 'arb-token-bridge-ui/src/components/common/Button';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const tabs = [
  { name: 'My Positions', href: '/earn/my' },
  { name: 'Market', href: '/earn/market' },
  { name: 'Learn', href: '/earn/learn' },
];

export default function EarnLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const isActiveTab = (href: string) => {
    if (href === '/earn/my') {
      return pathname === '/earn/my';
    }
    if (href === '/earn/market') {
      return pathname === '/earn/market' || pathname.startsWith('/earn/market/');
    }
    if (href === '/earn/learn') {
      return pathname === '/earn/learn';
    }
    return false;
  };

  return (
    <div className="min-h-screen bg-black">
      <div className="mx-auto max-w-7xl px-8 py-8">
        {/* Page Header */}
        <h1 className="mb-8 text-3xl font-bold text-white">Earn</h1>

        {/* Navigation Tabs */}
        <div className="mb-8 flex gap-2">
          {tabs.map((tab) => (
            <Link key={tab.href} href={tab.href}>
              <Button variant="secondary" className={isActiveTab(tab.href) ? 'bg-white/20' : ''}>
                {tab.name}
              </Button>
            </Link>
          ))}
        </div>

        {/* Page Content */}
        <div>{children}</div>
      </div>
    </div>
  );
}
