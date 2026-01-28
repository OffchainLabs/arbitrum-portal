'use client';

// NavWalletDisconnected - Connect wallet button
interface NavWalletDisconnectedProps {
  openConnectModal: () => void;
}

export function NavWalletDisconnected({ openConnectModal }: NavWalletDisconnectedProps) {
  return (
    <button
      onClick={openConnectModal}
      type="button"
      className="rounded-lg border border-gray-8 bg-gray-8 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-8/80"
    >
      Connect Wallet
    </button>
  );
}
