import { InformationCircleIcon } from '@heroicons/react/24/outline';
import { BigNumber } from 'ethers';
import { useEffect } from 'react';

import { RouteCost, Token } from '@/bridge/app/api/crosschain-transfers/types';

import { formatAmount, formatUSD } from '../../util/NumberUtils';
import { Dialog, UseDialogProps } from '../common/Dialog';
import { getAmountLoss } from './TransferWarningUtils';
import { getSelectedRouteContext, useRouteStore } from './hooks/useRouteStore';
import { getAmountToPay } from './useTransferReadiness';

type AmountProps =
  | {
      amount: string | number | BigNumber;
      token: Token;
      showToken: true;
    }
  | {
      amount: string | number | BigNumber;
      showToken?: false;
    };
function Amount(props: AmountProps) {
  if (props.showToken) {
    return <span>{formatAmount(BigNumber.from(props.amount), props.token)}</span>;
  }

  return <span>{formatUSD(Number(props.amount))}</span>;
}

function toAmountProps(costs: RouteCost[]): AmountProps[] {
  return costs.map((cost) =>
    typeof cost.amountUSD === 'undefined'
      ? { amount: cost.amount, token: cost.token, showToken: true }
      : { amount: cost.amountUSD },
  );
}

function LineWrapper({ title, amountProps }: { amountProps: AmountProps[]; title: string }) {
  return (
    <div className="flex items-center justify-between px-2 text-sm">
      <span>{title}</span>
      <div className="flex gap-1">
        {amountProps.map((amount, index) => (
          <span key={`${amount.showToken ? amount.token.address : 'usd'}-${index}`}>
            <Amount {...amount} />
            {amountProps.length > 1 && index < amountProps.length - 1 && <span>, </span>}
          </span>
        ))}
      </div>
    </div>
  );
}

export function HighSlippageWarningDialog(props: UseDialogProps) {
  const context = useRouteStore((state) => getSelectedRouteContext(state));
  const { onClose } = props;

  useEffect(() => {
    if (!context) {
      onClose(false);
    }
  }, [context, onClose]);

  if (!context) {
    return null;
  }

  const { amounts, fromAmountUsd, toAmountUsd } = getAmountToPay(context);

  const { diff, lossPercentage } = getAmountLoss({
    fromAmount: fromAmountUsd,
    toAmount: toAmountUsd,
  });

  return (
    <Dialog
      {...props}
      actionButtonTitle="Continue with transaction"
      title={
        <div className="flex h-10 flex-row items-center gap-2">
          <InformationCircleIcon height={30} />
          Slippage
        </div>
      }
      className="!max-w-[420px]"
    >
      <div className="mt-4 text-sm">
        Slippage for this transaction is {lossPercentage}%, that&apos;s quite high.
      </div>

      <div className="my-4 flex flex-col gap-2 text-sm">
        <LineWrapper
          title="Sending"
          amountProps={Object.values(amounts).map((amountToPay) => ({
            amount: amountToPay.amount,
            token: amountToPay.token,
            showToken: true,
          }))}
        />
        <LineWrapper title="Gas fees" amountProps={toAmountProps(context.gas)} />
        <LineWrapper title="Protocol fees" amountProps={toAmountProps(context.fee)} />
        <LineWrapper
          title="Receiving"
          amountProps={[
            {
              amount: toAmountUsd,
            },
          ]}
        />

        <div className="flex items-center justify-between rounded bg-orange-dark px-2 py-1 font-bold text-orange">
          <span>Value lost</span>
          <span>
            -{lossPercentage}%
            {diff > 0 && (
              <>
                {' ('}
                <Amount amount={diff} />)
              </>
            )}
          </span>
        </div>

        <p>You can adjust your slippage in Settings, or choose another route.</p>
      </div>
    </Dialog>
  );
}
