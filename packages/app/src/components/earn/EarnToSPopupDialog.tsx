'use client';

import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { useEffect, useState } from 'react';
import { twMerge } from 'tailwind-merge';

import { Checkbox } from '@/bridge/components/common/Checkbox';
import { Dialog } from '@/bridge/components/common/Dialog';
import { DialogProps } from '@/bridge/components/common/Dialog2';
import { ExternalLink } from '@/components/ExternalLink';

export function EarnToSPopupDialog(props: DialogProps & { isOpen: boolean }) {
  const [isChecked, setIsChecked] = useState(false);

  // Reset checkbox when dialog opens
  useEffect(() => {
    if (props.isOpen) {
      setIsChecked(false);
    }
  }, [props.isOpen]);

  const handleConfirm = () => {
    if (isChecked) {
      props.onClose(true, { tosAccepted: true });
    }
  };

  const handleCancel = () => {
    setIsChecked(false);
    props.onClose(false);
  };

  return (
    <Dialog
      isOpen={props.isOpen}
      onClose={handleCancel}
      title=""
      closeable
      isFooterHidden
      className="!border-0 !h-[100dvh] !min-h-[100dvh] !max-h-[100dvh] !rounded-none md:!h-auto md:!min-h-0 md:!max-w-[400px] md:!rounded"
    >
      <div className="flex h-full w-full flex-col gap-6 py-4">
        {/* Popup Body */}
        <div className="flex w-full flex-1 flex-col items-start gap-5">
          {/* Warning Icon */}
          <div className="flex items-center justify-center w-[63px] h-[63px] rounded-full bg-white/5">
            <ExclamationTriangleIcon className="w-[31.5px] h-[31.5px] text-[#CCB069]" />
          </div>

          {/* Title */}
          <h2 className="text-[28px] font-medium text-white leading-normal">
            Please acknowledge before proceeding
          </h2>

          {/* Disclaimer Text */}
          <div className="flex flex-col gap-0 text-[14px] text-white/70 leading-[1.35] tracking-[-0.28px] w-full">
            <p className="mb-0">
              The Arbitrum Portal is only a front-end interface for interacting with existing smart
              contract protocols. It does not host or control the underlying Defi smart contracts
              being presented to you here, nor does it manage funds or make investing decisions on
              your behalf. You are solely responsible for understanding how these protocols work
              before using them.
            </p>
            <p className="mb-0 mt-6">
              To learn more about the protocols we support and how we chose them, please visit our{' '}
              <ExternalLink
                href="https://arbitrum.io/tos"
                className="arb-hover underline text-white/70"
              >
                terms of service page
              </ExternalLink>
              .
            </p>
          </div>
        </div>

        {/* Checkbox */}
        <div className="flex w-full items-center gap-2.5">
          <Checkbox
            checked={isChecked}
            onChange={setIsChecked}
            label={
              <span className="text-sm text-white/50 leading-[1.35] tracking-[-0.24px]">
                I understand and wish to proceed.
              </span>
            }
          />
        </div>

        {/* Buttons */}
        <div className="mt-auto flex w-full flex-col gap-2.5 pb-2">
          {/* Proceed Button */}
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!isChecked}
            className={twMerge(
              'flex items-center justify-center gap-1 px-[15px] py-5 rounded-[15px] w-full text-[16px] font-medium text-center transition-opacity',
              isChecked
                ? 'bg-white text-black hover:opacity-90 cursor-pointer'
                : 'bg-white/50 text-black cursor-not-allowed opacity-50',
            )}
          >
            Proceed
          </button>

          {/* Go Back Button */}
          <button
            type="button"
            onClick={handleCancel}
            className="flex items-center justify-center gap-1 px-[15px] py-5 rounded-[15px] w-full text-[16px] font-medium text-white text-center border-none bg-transparent hover:bg-white/10 transition-colors cursor-pointer"
          >
            Go back
          </button>
        </div>
      </div>
    </Dialog>
  );
}
