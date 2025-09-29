'use client';

import { Sidebar } from '@offchainlabs/cobalt';
import { useSearchParams, useSelectedLayoutSegments } from 'next/navigation';
import { usePostHog } from 'posthog-js/react';
import { useState } from 'react';

function getActiveMenu(segment: string | undefined) {
  switch (segment) {
    case 'bridge':
      return 'Bridge';
    case '(portal)':
      return 'Home';
    case 'defi':
      return 'DeFi';
    case 'ai-and-depin':
      return 'AI & DePIN';
    case 'bridges-and-on-ramps':
      return 'Bridges & On-ramps';
    case 'gaming':
      return 'Gaming';
    case 'nfts':
      return 'NFTs';
    case 'infra-and-tools':
      return 'Infra & Tools';
    case 'arcade':
      return 'Arcade';
    case 'ecosystem':
      return 'Chain Navigator';
    case 'metrics':
      return 'Chain Stats';
    default:
      return '';
  }
}

export const AppSidebar = () => {
  const posthog = usePostHog();
  const searchParams = useSearchParams();
  const segments = useSelectedLayoutSegments();

  const [activeMenu, setActiveMenu] = useState(getActiveMenu(segments[segments.length - 1]));
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
