'use client';

import { PropsWithChildren } from 'react';

import { BlockedDialog } from '@/bridge/components/App/BlockedDialog';
import { useAccountIsBlocked } from '@/bridge/hooks/useAccountIsBlocked';

export function AccountBlockedGuard({ children }: PropsWithChildren) {
  const { address, isBlocked } = useAccountIsBlocked();

  if (address && isBlocked) {
    return <BlockedDialog address={address} isOpen={true} closeable={false} onClose={() => {}} />;
  }

  return children;
}
