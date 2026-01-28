'use client';

import { NavLinks } from './NavLinks';
import { NavLogo } from './NavLogo';
import { NavSearch } from './NavSearch';
import { NavWallet } from './NavWallet';

// MasterNavbar component - Top horizontal navigation bar
export function MasterNavbar() {
  return (
    <nav className="sticky top-0 z-50 flex w-full items-center justify-between border-b border-gray-8 bg-gray-1 px-6 py-3">
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
