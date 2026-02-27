'use client';

import { PropsWithChildren } from 'react';
import { useAccount } from 'wagmi';

import { BlockedDialog } from '@/bridge/components/App/BlockedDialog';
import { useAccountIsBlocked } from '@/bridge/hooks/useAccountIsBlocked';

export function AccountBlockedGuard({ children }: PropsWithChildren) {
  const { address } = useAccount();
  const { isBlocked } = useAccountIsBlocked();

  if (address && isBlocked) {
    return <BlockedDialog address={address} isOpen={true} closeable={false} onClose={() => {}} />;
  }

  return children;
}
