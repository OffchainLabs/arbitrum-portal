'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useEffect, useState } from 'react';

import { NavWalletConnected } from './NavWalletConnected';
import { NavWalletDisconnected } from './NavWalletDisconnected';

// NavWallet component - Wallet connection dropdown
// Only renders when mounted (client-side) to avoid SSR issues
export function NavWallet() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex items-center">
        <div className="h-10 w-24 animate-pulse rounded-lg bg-gray-8" />
      </div>
    );
  }

  return (
    <ConnectButton.Custom>
      {({ account, chain, openAccountModal, openConnectModal, mounted: buttonMounted }) => {
        const ready = buttonMounted;
        const connected = ready && account && chain;

        if (!ready) {
          return (
            <div className="flex items-center">
              <div className="h-10 w-24 animate-pulse rounded-lg bg-gray-8" />
            </div>
          );
        }

        if (connected) {
          return (
            <NavWalletConnected
              account={account}
              chain={chain}
              openAccountModal={openAccountModal}
            />
          );
        }

        return <NavWalletDisconnected openConnectModal={openConnectModal} />;
      }}
    </ConnectButton.Custom>
  );
}
