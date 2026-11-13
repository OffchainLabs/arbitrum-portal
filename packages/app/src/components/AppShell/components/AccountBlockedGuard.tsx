'use client';

import { PropsWithChildren } from 'react';

import { BlockedDialog } from '@/bridge/components/App/BlockedDialog';
import { useAccountIsBlocked } from '@/bridge/hooks/useAccountIsBlocked';

export function AccountBlockedGuard({ children }: PropsWithChildren) {
  const { isBlocked, blockedAddress } = useAccountIsBlocked();

  if (blockedAddress && isBlocked) {
    return (
      <BlockedDialog address={blockedAddress} isOpen={true} closeable={false} onClose={() => {}} />
    );
  }

  return children;
}
