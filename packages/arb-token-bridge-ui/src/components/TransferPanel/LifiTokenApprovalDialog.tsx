import type { TransactionParameters } from '@lifi/sdk';
import { utils } from 'ethers';
import { useMemo, useState } from 'react';

import { shortenAddress } from '../../util/CommonUtils';
import { Checkbox } from '../common/Checkbox';
import { Dialog, UseDialogProps } from '../common/Dialog';
import { NoteBox } from '../common/NoteBox';

export type LifiApprovalDialogData = {
  approvalRequest: TransactionParameters;
};

function getApprovalSpender(approvalRequest: TransactionParameters | undefined) {
  if (!approvalRequest?.data) {
    return undefined;
  }

  try {
    const erc20Interface = new utils.Interface([
      'function approve(address spender,uint256 amount)',
    ]);
    const [spender] = erc20Interface.decodeFunctionData('approve', approvalRequest.data);

    return typeof spender === 'string' ? spender : undefined;
  } catch {
    return undefined;
  }
}

export function LifiTokenApprovalDialog({
  approvalRequest,
  isOpen,
  onClose,
}: UseDialogProps & {
  approvalRequest: TransactionParameters | undefined;
}) {
  const [checked, setChecked] = useState(false);
  const spenderAddress = useMemo(() => getApprovalSpender(approvalRequest), [approvalRequest]);

  const closeWithReset = (confirmed: boolean) => {
    onClose(confirmed);
    setChecked(false);
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={closeWithReset}
      title="Acknowledge token approval"
      actionButtonTitle="Continue to approval"
      actionButtonProps={{ disabled: !checked }}
    >
      <div className="flex flex-col space-y-4 py-4 text-sm">
        <Checkbox
          label={
            <span className="font-light">
              I understand this LiFi route needs a token approval before the next transaction.
            </span>
          }
          checked={checked}
          onChange={setChecked}
        />

        <div className="space-y-2">
          {approvalRequest?.to && (
            <div className="flex justify-between gap-4">
              <span className="text-white/60">Token contract</span>
              <span>{shortenAddress(approvalRequest.to)}</span>
            </div>
          )}
          {spenderAddress && (
            <div className="flex justify-between gap-4">
              <span className="text-white/60">Spender contract</span>
              <span>{shortenAddress(spenderAddress)}</span>
            </div>
          )}
        </div>

        <NoteBox>
          Your wallet will ask you to approve token spending. After approval, LiFi will continue
          with the route.
        </NoteBox>
      </div>
    </Dialog>
  );
}
