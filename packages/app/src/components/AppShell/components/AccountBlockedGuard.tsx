'use client';

import { PropsWithChildren } from 'react';

import { BlockedDialog } from '@/bridge/components/App/BlockedDialog';
import { useAccountIsBlocked } from '@/bridge/hooks/useAccountIsBlocked';
import { useWallets } from '@/bridge/wallet/hooks/useWallets';

export function AccountBlockedGuard({ children }: PropsWithChildren) {
  const { sourceWallet } = useWallets();
  const address = sourceWallet.account.address;
  const { isBlocked } = useAccountIsBlocked();

  if (address && isBlocked) {
    return <BlockedDialog address={address} isOpen={true} closeable={false} onClose={() => {}} />;
  }

  return children;
}
