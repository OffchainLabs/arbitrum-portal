import { Dialog, DialogProps } from '../common/Dialog';

export function TrustWalletUpdateDialog(props: DialogProps) {
  return (
    <Dialog
      {...props}
      title="Warning: Trust Wallet"
      actionButtonTitle="Proceed"
      className="md:max-w-[480px]"
    >
      <div className="flex flex-col gap-3 py-4 text-sm font-light">
        <p>We detected you&apos;re connected via Trust Wallet.</p>

        <p>Old versions of Trust Wallet can sign on the wrong network and lose funds.</p>

        <p>
          Please ensure you are on the latest version of the mobile app or browser extension, and
          that you sign on the correct network.
        </p>
      </div>
    </Dialog>
  );
}
