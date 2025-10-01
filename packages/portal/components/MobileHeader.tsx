import React from 'react';

import { MobileHeaderLogo } from './MobileHeaderLogo';
import { MobileHeaderToggleMenu } from './MobileHeaderToggleMenu';

export function MobileHeader() {
  return (
    <header
      id="header"
      className="z-[10000] flex w-full items-center justify-between p-6 pb-0 sm:hidden"
    >
      {/* Arbitrum logo on the left side */}
      <div className="flex items-center">
        <MobileHeaderLogo />
      </div>

      {/* Toggle menu button with content on the right */}
      <MobileHeaderToggleMenu />
    </header>
  );
}
