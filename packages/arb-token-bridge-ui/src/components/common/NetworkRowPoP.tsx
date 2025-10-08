import { ExclamationCircleIcon } from '@heroicons/react/24/outline';
import Image from 'next/image';
import { CSSProperties } from 'react';
import { twMerge } from 'tailwind-merge';
import { shallow } from 'zustand/shallow';

import { ChainId } from '@/bridge/types/ChainId';

import { usePoPDisabledDialogVisibilityStore } from '../TransferPanel/PoPDisabledDialog';

export function NetworkRowPoP({
  chainId,
  isSelected,
  style,
  close,
}: {
  chainId: ChainId;
  isSelected: boolean;
  style: CSSProperties;
  close: (focusableElement?: HTMLElement) => void;
}) {
  const chainName = chainId === (70700 as ChainId) ? 'Proof of Play Apex' : 'Proof of Play Boss';
  const { showPoPDisabledDialog } = usePoPDisabledDialogVisibilityStore(
    (state) => ({
      showPoPDisabledDialog: state.showPoPDisabledDialog,
      closePoPDisabledDialog: state.closePoPDisabledDialog,
    }),
    shallow,
  );

  function handleClick() {
    showPoPDisabledDialog();
    close(); // close the popover after option-click
  }

  return (
    <button
      onClick={handleClick}
      key={chainId}
      style={style}
      type="button"
      className={twMerge(
        'flex h-[40px] w-full items-center gap-4 rounded px-4 py-2 text-lg transition-[background] duration-200 hover:bg-white/10',
        isSelected && 'bg-white/20 hover:bg-white/20', // selected row
      )}
    >
      <div
        className={twMerge(
          'flex shrink-0 items-center justify-center rounded-full h-4 w-4 p-[2px]',
        )}
      >
        <Image
          src="/images/PopApexLogo.webp"
          alt="PoP logo"
          className="h-full w-auto"
          width={20}
          height={20}
        />
      </div>
      <div className={twMerge('flex w-full flex-row items-center justify-between gap-1')}>
        <span className="truncate text-base">{chainName}</span>
      </div>
      <ExclamationCircleIcon className="h-4 w-4 text-brick" />
    </button>
  );
}
