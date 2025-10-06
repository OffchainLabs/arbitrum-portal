'use client';

import { Sidebar } from '@offchainlabs/cobalt';
import { usePathname, useSearchParams } from 'next/navigation';
import { usePostHog } from 'posthog-js/react';
import { useEffect, useState } from 'react';

export const AppSidebar = () => {
  const posthog = usePostHog();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    switch (pathname) {
      case '/bridge':
        setActiveMenu('Bridge');
        break;
      case '/':
        setActiveMenu('Home');
        break;
      case '/projects/defi':
        setActiveMenu('DeFi');
        break;
      case '/projects/ai-and-depin':
        setActiveMenu('AI & DePIN');
        break;
      case '/projects/bridges-and-on-ramps':
        setActiveMenu('Bridges & On-ramps');
        break;
      case '/projects/gaming':
        setActiveMenu('Gaming');
        break;
      case '/projects/nfts':
        setActiveMenu('NFTs');
        break;
      case '/projects/infra-and-tools':
        setActiveMenu('Infra & Tools');
        break;
      case '/arcade':
        setActiveMenu('Arcade');
        break;
      case '/chains/ecosystem':
        setActiveMenu('Ecosystem');
        break;
      case '/chains/metrics':
        setActiveMenu('Metrics');
        break;
      default:
        setActiveMenu('');
        break;
    }
  }, [pathname]);

  const [activeMenu, setActiveMenu] = useState('Home');
  const chainsParam = searchParams.get('chains') || '';
  const linkPostfix = chainsParam && `?chains=${encodeURIComponent(chainsParam)}`;

  return (
    <div className="sticky top-0 z-50 h-full">
      <Sidebar
        logger={posthog}
        activeMenu={activeMenu}
        linkPostfix={linkPostfix}
        onMenuItemClick={setActiveMenu}
      />
    </div>
  );
};
