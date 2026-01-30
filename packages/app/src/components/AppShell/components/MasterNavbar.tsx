'use client';

import { NavLinks } from './NavLinks';
import { NavLogo } from './NavLogo';
import { NavSearch } from './NavSearch';
import { NavWallet } from './NavWallet';

// MasterNavbar component - Top horizontal navigation bar
// Translucent background with backdrop blur for modern glass effect
export function MasterNavbar() {
  return (
    <nav
      id="sticky-top-bar"
      className="fixed top-0 left-0 right-0 z-50 flex h-[66px] w-full items-center justify-between border-0 bg-black/70 backdrop-blur-sm px-4"
    >
      {/* Left section: Logo + Search */}
      <div className="flex items-center gap-3">
        <NavLogo />
        <NavSearch />
      </div>

      {/* Center section: Navigation links */}
      <div className="absolute left-1/2 -translate-x-1/2">
        <NavLinks />
      </div>

      {/* Right section: Wallet */}
      <div className="flex items-center">
        <NavWallet />
      </div>
    </nav>
  );
}
