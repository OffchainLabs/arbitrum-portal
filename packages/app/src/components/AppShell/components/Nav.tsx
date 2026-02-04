import { SiteBanner } from '@/bridge/components/common/SiteBanner';

import { NAVBAR_HEIGHTS } from '../config/navConfig';
import { NavLinks } from './NavLinks';
import { NavLogo } from './NavLogo';
import { NavSearch } from './NavSearch';
import { NavWallet } from './NavWallet';

export function Nav() {
  return (
    <nav id="sticky-top-bar" className="fixed top-0 left-0 right-0 z-50 flex flex-col w-full">
      <SiteBanner />
      <div
        className="flex w-full items-center justify-between border-0 bg-black/70 backdrop-blur-sm px-4"
        style={{ height: `${NAVBAR_HEIGHTS.DESKTOP}px` }}
      >
        <div className="flex items-center gap-2">
          <NavLogo />
          <NavSearch />
        </div>

        <div className="absolute left-1/2 -translate-x-1/2">
          <NavLinks />
        </div>

        <div className="flex items-center">
          <NavWallet />
        </div>
      </div>
    </nav>
  );
}
