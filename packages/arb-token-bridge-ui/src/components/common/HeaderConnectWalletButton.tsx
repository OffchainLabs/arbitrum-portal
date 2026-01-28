import { PlusCircleIcon } from '@heroicons/react/24/outline';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { twMerge } from 'tailwind-merge';

export function HeaderConnectWalletButton() {
  return (
    <ConnectButton.Custom>
      {({ openConnectModal }) => (
        <div className="w-full px-4 sm:px-0">
          <button
            onClick={openConnectModal}
            type="button"
            className={twMerge(
              'arb-hover flex w-full flex-row items-center border border-primary-cta bg-primary-cta px-3 py-3 text-white',
              'sm:min-w-[188px] sm:rounded sm:bg-primary-cta sm:py-1 sm:pl-2 sm:pr-3 sm:text-base sm:font-normal',
            )}
          >
            <PlusCircleIcon className="mr-3 h-6 w-6 stroke-1 sm:h-10 sm:w-10" />
            Connect Wallet
          </button>
        </div>
      )}
    </ConnectButton.Custom>
  );
}
