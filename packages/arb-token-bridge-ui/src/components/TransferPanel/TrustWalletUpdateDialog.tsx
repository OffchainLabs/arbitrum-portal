import { Dialog, DialogProps } from '../common/Dialog';

export function TrustWalletUpdateDialog(props: DialogProps) {
  return (
    <Dialog
      {...props}
      title="Update Trust Wallet"
      actionButtonTitle="Confirm"
      className="md:max-w-[480px]"
    >
      <p className="py-4 text-sm font-light">
        Old versions of Trust Wallet can sign on the wrong network and lose funds. Please ensure you
        are on the latest version of the mobile app or browser extension, and that you sign on the
        correct network.
      </p>
    </Dialog>
  );
}
