import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react';
import { twMerge } from 'tailwind-merge';
import {
  CheckIcon,
  ChevronDownIcon,
  PaperAirplaneIcon,
  WalletIcon,
} from '@heroicons/react/24/outline';
'use client'

import { isOnrampEnabled } from '../../util/featureFlag';
import { Button } from '../common/Button';
import { Transition } from '../common/Transition';
import { usePathname } from 'next/navigation';
import { useRouter } from 'next/navigation';

import { BUY_EMBED_PATHNAME, EMBED_PATHNAME } from '@/bridge/constants';
import { useSearchParams } from 'next/navigation';

interface ModeOptionProps {
  icon: React.ReactNode;
  label: string;
  isSelected: boolean;
  onClick: () => void;
}

const ModeOption = ({ icon, label, isSelected, onClick }: ModeOptionProps) => {
  return (
    <button
      className="flex w-full items-center justify-between rounded-md p-2 text-left text-white hover:bg-white/5"
      onClick={onClick}
    >
      <div className="flex items-center gap-2">
        {icon}
        <span>{label}</span>
      </div>
      {isSelected && <CheckIcon className="h-3 w-3 text-green-500" />}
    </button>
  );
};

export const WidgetModeDropdown = () => {
  const showBuyPanel = isOnrampEnabled();
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const isBuyTab = pathname === BUY_EMBED_PATHNAME
  const isBridgeTab = pathname === EMBED_PATHNAME

  if (!showBuyPanel) {
    // If buy panel is not enabled, just show the bridge button without dropdown
    return (
      <Button
        variant="secondary"
        className="h-[40px] px-[10px] py-[10px] text-white disabled:bg-transparent disabled:text-white disabled:opacity-100"
        disabled
      >
        <div className="flex items-center gap-2">
          <PaperAirplaneIcon className="h-3 w-3" />
          Bridge
        </div>
      </Button>
    );
  }

  return (
    <Popover className="relative">
      {({ open, close }) => (
        <>
          <PopoverButton as="div">
            <Button
              variant="secondary"
              className="h-[40px] px-[10px] py-[10px] text-white disabled:bg-transparent disabled:text-white disabled:opacity-100"
            >
              <div className="flex items-center gap-2">
                {isBuyTab ? (
                  <WalletIcon className="h-3 w-3" />
                ) : (
                  <PaperAirplaneIcon className="h-3 w-3" />
                )}
                {isBuyTab ? 'Buy' : 'Bridge'}
                <ChevronDownIcon
                  className={twMerge('h-3 w-3 opacity-30 transition-all', open && 'rotate-180')}
                />
              </div>
            </Button>
          </PopoverButton>
          <Transition>
            <PopoverPanel className="absolute left-0 top-0 z-10 w-[150px] origin-top overflow-hidden rounded-md text-sm text-white">
              <div className="bg-widget-background flex w-full flex-col gap-1 rounded-md border border-white/20 p-2">
                <ModeOption
                  icon={<PaperAirplaneIcon className="h-3 w-3" />}
                  label="Bridge"
                  isSelected={isBridgeTab}
                  onClick={() => {
                    router.push(`${EMBED_PATHNAME}?${searchParams.toString()}`)
                    close()
                  }}
                />
                <ModeOption
                  icon={<WalletIcon className="h-3 w-3" />}
                  label="Buy"
                  isSelected={isBuyTab}
                  onClick={() => {
                    router.push(
                      `${BUY_EMBED_PATHNAME}?${searchParams.toString()}`
                    )
                    close()
                  }}
                />
              </div>
            </PopoverPanel>
          </Transition>
        </>
      )}
    </Popover>
  );
};
