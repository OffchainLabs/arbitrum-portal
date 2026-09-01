import { InformationCircleIcon } from '@heroicons/react/24/outline';
import { BigNumber } from 'ethers';
import { useEffect } from 'react';

import { useNetworks } from '../../hooks/useNetworks';
import { formatAmount } from '../../util/NumberUtils';
import { Dialog, UseDialogProps } from '../common/Dialog';
import { getSelectedRouteContext, useRouteStore } from './hooks/useRouteStore';

export function AmountMismatchWarningDialog(props: UseDialogProps) {
  const context = useRouteStore((state) => getSelectedRouteContext(state));
  const [networks] = useNetworks();
  const { onClose } = props;

  useEffect(() => {
    if (!context) {
      onClose(false);
    }
  }, [context, onClose]);

  if (!context) {
    return null;
  }

  const fromAmount = formatAmount(
    BigNumber.from(context.fromAmount.amount),
    context.fromAmount.token,
  );
  const toAmount = formatAmount(BigNumber.from(context.toAmount.amount), context.toAmount.token);

  return (
    <Dialog
      {...props}
      actionButtonTitle="Continue with transaction"
      title={
        <div className="flex h-10 flex-row items-center gap-2">
          <InformationCircleIcon height={30} />
          Token amount mismatch
        </div>
      }
      className="!max-w-[420px]"
    >
      <div className="my-4 text-sm">
        Hey! You are transferring {fromAmount} on {networks.sourceChain.name} to {toAmount} on{' '}
        {networks.destinationChain.name}.
      </div>
    </Dialog>
  );
}
