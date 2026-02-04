'use client';

import { SiteBanner } from '@/bridge/components/common/SiteBanner';

import { NAVBAR_HEIGHT_CLASSES } from '../../config/navConfig';
import { NavLogo } from '../NavLogo';
import { NavSearch } from '../NavSearch';
import { NavWallet } from '../NavWallet';

export function NavHeaderMobile() {
  return (
    <nav
      id="sticky-top-bar-mobile"
      className="fixed top-0 left-0 right-0 z-50 flex flex-col w-full md:hidden"
    >
      <SiteBanner />
      <div
        className={`flex ${NAVBAR_HEIGHT_CLASSES.MOBILE} w-full items-center gap-2 border-0 bg-black/70 backdrop-blur-sm px-4`}
      >
        <div className="flex shrink-0 items-center">
          <NavLogo />
        </div>

        <div className="flex flex-1 items-center min-w-0 w-full justify-end">
          <NavSearch />
        </div>

        <div className="flex shrink-0 items-center">
          <NavWallet />
        </div>
      </div>
    </nav>
  );
}
