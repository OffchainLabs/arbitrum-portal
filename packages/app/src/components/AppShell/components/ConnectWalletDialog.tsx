'use client';

import { ConnectWallet, SignUp, useAuth } from '@zerodev/wallet-react-ui';

/**
 * External wallets only: composing <SignUp> without Passkey/Google/Email units
 * is how the kit disables the embedded-wallet and social flows entirely.
 * The kit renders an inline card (not an overlay), so we provide the modal
 * chrome ourselves and drive visibility via useAuth().step.
 */
export function ConnectWalletDialog() {
  const { step, reset } = useAuth();

  if (step === null) {
    return null;
  }

  // Mirror the kit's own X button: reset() closes the flow and clears its
  // transient state (email, OTP session), unlike a bare goToStep(null).
  const close = () => reset();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70" aria-hidden onClick={close} />
      <div className="relative max-h-full">
        <ConnectWallet
          size="md"
          onClose={close}
          renderSignUp={() => (
            <SignUp>
              <SignUp.Wallet walletId="metamask" />
              <SignUp.InstalledWallets excludeWalletIds={['metamask']} />
              <SignUp.WalletConnect />
              <SignUp.Divider />
              <SignUp.MoreWallets />
            </SignUp>
          )}
        />
      </div>
    </div>
  );
}
