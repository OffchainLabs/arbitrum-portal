import Image from 'next/image';
import React from 'react';
import { twMerge } from 'tailwind-merge';

import ArbitrumLogoSmall from '@/images/ArbitrumLogo.svg';

import { useDestinationChainStyle } from '../../hooks/useDestinationChainStyle';
import { useMode } from '../../hooks/useMode';
import { useNetworks } from '../../hooks/useNetworks';
import { isExperimentalModeEnabled } from '../../util';
import { isNetwork } from '../../util/networks';
import { HeaderConnectWalletButton } from './HeaderConnectWalletButton';

export function HeaderAccountOrConnectWalletButton() {
  // Wallet connection is now handled by AppShell
  // This component is kept for backward compatibility
  return <HeaderConnectWalletButton />;
}

export function Header({ children }: { children?: React.ReactNode }) {
  const [{ sourceChain }] = useNetworks();
  const { embedMode } = useMode();
  const { isTestnet } = isNetwork(sourceChain.id);

  const isExperimentalMode = isExperimentalModeEnabled();

  const destinationChainStyle = useDestinationChainStyle();

  if (embedMode) return null;

  return (
    <header
      className={twMerge(
        'sticky top-0 z-10 flex h-20 w-full justify-center bg-black/70 px-4 backdrop-blur sm:relative sm:h-20 sm:px-7 sm:backdrop-blur-none [body.menu-open_&]:fixed',
        isTestnet || isExperimentalMode
          ? 'sm:border-b sm:border-white sm:bg-white/20'
          : 'sm:bg-transparent',
        destinationChainStyle.borderColor ? 'sm:border-b' : '',
      )}
      style={{
        ...destinationChainStyle,
        borderColor: isExperimentalMode ? 'red' : destinationChainStyle.borderColor,
      }}
    >
      <div className="flex w-full items-center justify-end gap-2 text-white">
        <Image className="mr-auto h-8 w-8 sm:hidden" src={ArbitrumLogoSmall} alt="Arbitrum" />
        {isTestnet && !isExperimentalMode && <span className="grow font-medium">TESTNET MODE</span>}
        {isExperimentalMode && (
          <span className="grow font-medium text-red-500">
            EXPERIMENTAL MODE: features may be incomplete or not work properly
          </span>
        )}
        <div className="hidden sm:flex">{children}</div>
      </div>
    </header>
  );
}
