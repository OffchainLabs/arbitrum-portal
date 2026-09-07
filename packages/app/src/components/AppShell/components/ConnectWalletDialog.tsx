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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* The kit's X button closes via its internal reset(); the backdrop is
          portal chrome the kit can't see, so it needs the explicit call. */}
      <div className="absolute inset-0 bg-black/70" aria-hidden onClick={() => reset()} />
      <div className="relative max-h-full">
        <ConnectWallet
          size="md"
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
