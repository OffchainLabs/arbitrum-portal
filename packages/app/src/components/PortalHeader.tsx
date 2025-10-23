'use client';

import {
  Header,
  HeaderAccountOrConnectWalletButton,
} from 'arb-token-bridge-ui/src/components/common/Header';

/**
 * Global header component with wallet connection
 * Uses the Bridge's Header wrapper and HeaderAccountOrConnectWalletButton for full functionality
 * Network-specific features (TESTNET MODE indicator, etc.) only appear on Bridge pages
 * Requires bridge.css to be imported for proper styling
 */
export function PortalHeader() {
  return (
    <Header>
      <HeaderAccountOrConnectWalletButton />
    </Header>
  );
}
