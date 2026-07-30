import { useState } from 'react';

import { Checkbox } from '../common/Checkbox';
import { Dialog, DialogProps } from '../common/Dialog';

export function TrustWalletUpdateDialog(props: DialogProps) {
  const [acknowledged, setAcknowledged] = useState(false);

  function closeWithReset(confirmed: boolean) {
    props.onClose(confirmed);
    setAcknowledged(false);
  }

  return (
    <Dialog
      {...props}
      onClose={closeWithReset}
      title="Update Trust Wallet"
      actionButtonTitle="Proceed"
      actionButtonProps={{ disabled: !acknowledged }}
      className="md:max-w-[480px]"
    >
      <div className="flex flex-col gap-4 py-4 text-sm font-light">
        <p>
          Older versions can sign on the wrong network and lose funds. Fixed in mobile{' '}
          <span className="font-medium">26.30.6</span> and extension{' '}
          <span className="font-medium">2.91.4</span>.
        </p>

        <Checkbox
          label={
            <span className="font-light">
              My Trust Wallet is up to date. I proceed at my own risk.
            </span>
          }
          checked={acknowledged}
          onChange={setAcknowledged}
        />
      </div>
    </Dialog>
  );
}
