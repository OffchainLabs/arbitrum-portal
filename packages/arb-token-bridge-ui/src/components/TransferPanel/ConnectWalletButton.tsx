import { useWalletModal } from '../../wallet/hooks/useWalletModal';
import { Button } from '../common/Button';

export function ConnectWalletButton({ onClick }: { onClick?: () => void }) {
  const { openConnectModal } = useWalletModal();

  return (
    <Button
      variant="primary"
      onClick={onClick ?? openConnectModal}
      className="w-full border border-primary-cta bg-primary-cta py-4 text-lg lg:text-2xl"
    >
      <span className="block w-full truncate">Connect Wallet</span>
    </Button>
  );
}
