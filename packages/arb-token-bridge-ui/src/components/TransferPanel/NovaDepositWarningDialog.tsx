import { Dialog, DialogProps } from '../common/Dialog';

export function NovaDepositWarningDialog(props: DialogProps) {
  return (
    <Dialog
      {...props}
      title="Arbitrum Nova is losing support."
      cancelButtonTitle="No, bridge to Arbitrum One"
      actionButtonTitle="Yes, proceed to Nova"
      className="md:max-w-[560px]"
    >
      <div className="flex flex-col gap-4 py-4">
        <p>
          Nova is now in a minimized maintenance state.
          <br />
          We strongly advise to bridge your funds to{' '}
          <span className="font-semibold">Arbitrum One</span> instead.
          <br />
          <br /> Are you sure you still want to bridge to Arbitrum Nova?
        </p>
      </div>
    </Dialog>
  );
}
