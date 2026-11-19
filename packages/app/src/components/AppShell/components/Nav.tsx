import { SiteBanner } from '@/bridge/components/common/SiteBanner';

import { NavLogo } from './NavLogo';
import { NavSearch } from './NavSearch';
import { NavWallet } from './NavWallet';

export function Nav() {
  return (
    <nav id="sticky-top-bar" className="fixed top-0 right-0 left-0 z-50 flex w-full flex-col">
      <SiteBanner />
      <div className="flex h-[66px] w-full items-center gap-2 border-0 bg-black/70 px-4 backdrop-blur-xs">
        <div className="flex w-full items-center justify-between gap-2 md:w-auto">
          <NavLogo />
          <NavSearch />
        </div>

        <div className="flex items-center justify-end md:w-full">
          <NavWallet />
        </div>
      </div>
    </nav>
  );
}
