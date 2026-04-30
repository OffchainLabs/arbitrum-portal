'use client';

import { ReactNode } from 'react';

import { Button } from '@/bridge/components/common/Button';
import { Loader } from '@/bridge/components/common/atoms/Loader';
import { useWalletModal } from '@/bridge/wallet/hooks/useWalletModal';

interface EarnActionSubmitButtonProps {
  label: string | ReactNode;
  onClick: () => void | Promise<void>;
  isSubmitting?: boolean;
  disabled?: boolean;
  isConnected?: boolean;
}

export function EarnActionSubmitButton({
  label,
  onClick,
  isSubmitting = false,
  disabled = false,
  isConnected = true,
}: EarnActionSubmitButtonProps) {
  const { openConnectModal } = useWalletModal();

  const handleClick = () => {
    if (!isConnected) {
      openConnectModal();
    } else {
      onClick();
    }
  };

  const displayLabel = !isConnected ? 'Connect Wallet' : label;

  return (
    <Button
      variant="primary"
      onClick={handleClick}
      disabled={isConnected && (disabled || isSubmitting)}
      className="w-full py-3 rounded bg-primary-cta border-none text-base disabled:bg-gray-650 disabled:border-none disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isSubmitting ? (
        <div className="flex items-center gap-2">
          <Loader size="small" color="white" />
          Executing...
        </div>
      ) : (
        displayLabel
      )}
    </Button>
  );
}
