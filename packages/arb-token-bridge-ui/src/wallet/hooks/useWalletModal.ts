import { useAuth } from '@zerodev/wallet-react-ui';
import { useCallback } from 'react';

export function useWalletModal() {
  const { goToStep } = useAuth();

  const openConnectModal = useCallback(async () => {
    goToStep('sign-up');
  }, [goToStep]);

  return {
    openConnectModal,
  };
}
