'use client';

import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { usePostHog } from 'posthog-js/react';
import { useState } from 'react';
import { useAccount } from 'wagmi';

import { Checkbox } from '@/bridge/components/common/Checkbox';
import { Dialog } from '@/bridge/components/common/Dialog';
import { DialogProps } from '@/bridge/components/common/Dialog2';
import { TERMS_OF_SERVICE_LINK } from '@/common/constants';
import { ExternalLink } from '@/components/ExternalLink';

export function EarnToSPopupDialog(props: DialogProps & { isOpen: boolean }) {
  const [isChecked, setIsChecked] = useState(false);
  const posthog = usePostHog();
  const { address } = useAccount();

  return (
    <Dialog
      isOpen={props.isOpen}
      onClose={props.onClose}
      title=""
      closeable
      containerClassName="!z-[100]" // z-100 exception here to ensure it's above the action panel
      actionButtonTitle="Proceed"
      actionButtonProps={{
        disabled: !isChecked,
        onClick: () => {
          if (isChecked) {
            posthog?.capture('Earn ToS Accepted', {
              walletAddress: address,
              acceptedAt: new Date().toISOString(),
            });
            props.onClose(true, { tosAccepted: true });
          }
        },
      }}
      className="!border-0 !h-[100dvh] !min-h-[100dvh] !max-h-[100dvh] !rounded-none md:!h-auto md:!min-h-0 md:!max-w-[400px] md:!rounded"
    >
      <div className="flex h-full w-full flex-col gap-6 pt-4 pb-8 md:pt-0 md:pb-4">
        <div className="flex w-full flex-1 flex-col items-start gap-5">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/5">
            <ExclamationTriangleIcon className="h-8 w-8 text-pending" />
          </div>

          <h2 className="text-[28px] font-medium leading-normal text-white">
            Please acknowledge before proceeding
          </h2>

          <div className="text-[14px] leading-[1.35] tracking-[-0.28px] text-white/70">
            <p>
              Arbitrum Earn is a non-custodial front-end interface for interacting with third party
              protocols. You acknowledge and agree that transactions:
            </p>
            <ol className="mt-3 list-decimal space-y-2 px-6">
              <li>
                are facilitated by third party protocols which are not controlled by Arbitrum Earn
                and{' '}
              </li>{' '}
              <li>
                involve risks including those related to novel blockchain technologies and loss of
                funds.
              </li>
            </ol>
            <br />
            You are solely responsible for understanding how the third party protocols work before
            using them. Do your own independent research and proceed at your own risk.
          </div>
        </div>

        <hr className="border-white/10" />

        <div className="flex w-full gap-6 h-24 items-start">
          <Checkbox
            checked={isChecked}
            onChange={setIsChecked}
            labelClassName="h-8"
            label={
              <span className="text-sm text-white/50">
                You have read, and agree to be bound by, our{' '}
                <ExternalLink
                  href={TERMS_OF_SERVICE_LINK}
                  className="arb-hover text-white/50 underline"
                >
                  Terms of Service
                </ExternalLink>
                , and, where applicable, you are subject to the underlying third party
                protocol&apos;s terms of service.
              </span>
            }
          />
        </div>
      </div>
    </Dialog>
  );
}
