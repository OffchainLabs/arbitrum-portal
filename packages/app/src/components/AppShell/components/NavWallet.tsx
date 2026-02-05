'use client';

import { Popover } from '@headlessui/react';
import {
  ArrowLeftOnRectangleIcon,
  ArrowTopRightOnSquareIcon,
  CheckIcon,
  ChevronDownIcon,
  CodeBracketIcon,
  DocumentDuplicateIcon,
} from '@heroicons/react/24/outline';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useCopyToClipboard } from 'react-use';
import { twMerge } from 'tailwind-merge';
import { useDisconnect } from 'wagmi';

import { CustomBoringAvatar } from '@/bridge/components/common/CustomBoringAvatar';
import { SafeImage } from '@/bridge/components/common/SafeImage';
import { useAccountMenu } from '@/bridge/hooks/useAccountMenu';
import { getExplorerUrl } from '@/bridge/util/networks';

const MENU_ITEM_BUTTON_CLASSES =
  'opacity-70 hover:opacity-100 flex items-center gap-2 rounded-sm px-2 py-2 text-sm text-white cursor-pointer transition-colors hover:bg-neutral-25/50 focus:bg-neutral-25/50 w-full';
const ICON_CLASSES = 'h-4 w-4 shrink-0';
const AVATAR_CLASSES = 'h-6 w-6 rounded-full shrink-0';

interface WalletConnectedDropdownProps {
  account: {
    address: string;
    displayName?: string;
    displayBalance?: string;
    ensAvatar?: string | null;
    ensName?: string | null;
  };
  chain: {
    id: number;
    name?: string;
    unsupported?: boolean;
  };
}

function WalletConnectedDropdown({ account, chain }: WalletConnectedDropdownProps) {
  const { address, accountShort, ensName, ensAvatar, udInfo, setQueryParams } = useAccountMenu();
  const { disconnect } = useDisconnect();
  const [, copyToClipboard] = useCopyToClipboard();
  const [showCopied, setShowCopied] = useState(false);
  const pathname = usePathname();
  const isBridgeRoute = pathname.startsWith('/bridge');

  const handleSettingsClick = () => {
    setQueryParams({ settingsOpen: true });
  };

  const displayAddress = address || account.address;
  const displayAvatar = ensAvatar;

  const formattedAddress = displayAddress
    ? `${displayAddress.slice(0, 2)}${displayAddress.slice(2, 4)}...${displayAddress.slice(-4)}`
    : '';

  function copy(value: string) {
    setShowCopied(true);
    copyToClipboard(value);
    setTimeout(() => setShowCopied(false), 1000);
  }

  const explorerUrl =
    chain && displayAddress ? `${getExplorerUrl(chain.id)}/address/${displayAddress}` : null;

  const truncatedAddress = displayAddress
    ? `${displayAddress.slice(0, 6)}...${displayAddress.slice(-4)}`
    : '';
  const displayName = ensName ?? udInfo?.name ?? accountShort ?? truncatedAddress;

  const Avatar = () => (
    <SafeImage
      src={displayAvatar || undefined}
      className={AVATAR_CLASSES}
      fallback={<CustomBoringAvatar size={24} name={displayAddress} />}
    />
  );

  return (
    <Popover className="relative">
      {({ open }) => (
        <>
          <Popover.Button className="flex items-center gap-2 rounded-md bg-neutral-25 px-2 py-2 text-sm text-white transition-colors hover:bg-neutral-25/80 ui-open:bg-neutral-25/90">
            <Avatar />
            <span className="text-sm hidden md:block">{displayName}</span>
            <ChevronDownIcon
              className={twMerge(
                ICON_CLASSES,
                'transition-transform hidden md:block',
                open && 'rotate-180',
              )}
            />
          </Popover.Button>

          <Popover.Panel className="absolute right-0 top-[0px] z-50 w-56 rounded-md border-0 bg-gray-1 p-3 shadow-lg">
            <button
              onClick={() => copy(displayAddress)}
              className={twMerge(MENU_ITEM_BUTTON_CLASSES, 'px-2 py-2.5 mb-0.5')}
              aria-label="Copy address"
            >
              <Avatar />
              <span className="text-sm text-white flex-1 text-left">{formattedAddress}</span>
              {showCopied ? (
                <>
                  <CheckIcon className={twMerge(ICON_CLASSES, 'text-gray-5')} />
                  <span className="text-xs text-gray-5 shrink-0">Copied!</span>
                </>
              ) : (
                <DocumentDuplicateIcon className={twMerge(ICON_CLASSES, 'text-gray-5')} />
              )}
            </button>

            <hr className="my-1 border-gray-8" />

            {explorerUrl && (
              <button
                onClick={() => window.open(explorerUrl, '_blank', 'noopener,noreferrer')}
                className={MENU_ITEM_BUTTON_CLASSES}
              >
                <ArrowTopRightOnSquareIcon className={twMerge(ICON_CLASSES, 'text-white')} />
                <span>Explorer</span>
              </button>
            )}

            {isBridgeRoute && (
              <button onClick={handleSettingsClick} className={MENU_ITEM_BUTTON_CLASSES}>
                <CodeBracketIcon className={twMerge(ICON_CLASSES, 'text-white')} />
                <span>Bridge Dev Tools</span>
              </button>
            )}

            <button onClick={() => disconnect()} className={MENU_ITEM_BUTTON_CLASSES}>
              <ArrowLeftOnRectangleIcon className={twMerge(ICON_CLASSES, 'text-white')} />
              <span>Disconnect Wallet</span>
            </button>
          </Popover.Panel>
        </>
      )}
    </Popover>
  );
}

interface WalletDisconnectedButtonProps {
  openConnectModal: () => void;
}

function WalletDisconnectedButton({ openConnectModal }: WalletDisconnectedButtonProps) {
  return (
    <button
      onClick={openConnectModal}
      type="button"
      className="rounded-md bg-primary-cta px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-cta/80"
    >
      Connect Wallet
    </button>
  );
}

export function NavWallet() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex items-center">
        <div className="h-10 w-24 animate-pulse rounded-lg bg-neutral-25" />
      </div>
    );
  }

  return (
    <ConnectButton.Custom>
      {({ account, chain, openConnectModal, mounted: buttonMounted }) => {
        const ready = buttonMounted;
        const connected = ready && account && chain;

        if (!ready) {
          return (
            <div className="flex items-center">
              <div className="h-10 w-24 animate-pulse rounded-lg bg-neutral-25" />
            </div>
          );
        }

        if (connected) {
          return <WalletConnectedDropdown account={account} chain={chain} />;
        }

        return <WalletDisconnectedButton openConnectModal={openConnectModal} />;
      }}
    </ConnectButton.Custom>
  );
}
