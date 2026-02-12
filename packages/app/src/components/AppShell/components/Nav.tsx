import { SiteBanner } from '@/bridge/components/common/SiteBanner';

import { NavLogo } from './NavLogo';
import { NavSearch } from './NavSearch';
import { NavWallet } from './NavWallet';

export function Nav() {
  return (
    <nav id="sticky-top-bar" className="fixed top-0 left-0 right-0 z-50 flex flex-col w-full">
      <SiteBanner />
      <div className="flex h-14 w-full items-center gap-2 border-0 bg-black/70 backdrop-blur-sm px-4">
        <div className="flex items-center gap-2 w-full justify-between md:w-auto">
          <NavLogo />
          <NavSearch />
        </div>

        <div className="flex items-center md:w-full justify-end">
          <NavWallet />
        </div>
      </div>
    </nav>
  );
}
