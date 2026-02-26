'use client';

import React from 'react';
import { useAccount } from 'wagmi';

import { BlockedDialog } from '@/bridge/components/App/BlockedDialog';
import { useAccountIsBlocked } from '@/bridge/hooks/useAccountIsBlocked';

export function AccountBlockedGuard() {
  const { address } = useAccount();
  const { isBlocked } = useAccountIsBlocked();

  if (!address || !isBlocked) {
    return null;
  }

  return <BlockedDialog address={address} isOpen={true} closeable={false} onClose={() => {}} />;
}
