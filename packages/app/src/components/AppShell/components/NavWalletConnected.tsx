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
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { useCopyToClipboard } from 'react-use';
import { twMerge } from 'tailwind-merge';
import { useDisconnect } from 'wagmi';

import { CustomBoringAvatar } from '@/bridge/components/common/CustomBoringAvatar';
import { SafeImage } from '@/bridge/components/common/SafeImage';
import { useAccountMenu } from '@/bridge/hooks/useAccountMenu';
import { getExplorerUrl } from '@/bridge/util/networks';

// Shared class constants
const MENU_ITEM_BUTTON_CLASSES =
  'opacity-70 hover:opacity-100 flex items-center gap-2 rounded-sm px-2 py-2 text-sm text-white cursor-pointer transition-colors hover:bg-gray-8/50 focus:bg-gray-8/50 w-full';
const ICON_CLASSES = 'h-4 w-4 shrink-0';
const AVATAR_CLASSES = 'h-6 w-6 rounded-full shrink-0';

// NavWalletConnected - Connected wallet display with dropdown
// Types inferred from ConnectButton.Custom render props
interface NavWalletConnectedProps {
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
  openAccountModal: () => void;
}

export function NavWalletConnected({ account, chain }: NavWalletConnectedProps) {
  // Use useAccountMenu hook for ENS/UD data and setQueryParams (safe because ConnectButton.Custom only renders within WagmiProvider)
  const { address, accountShort, ensName, ensAvatar, udInfo, setQueryParams } = useAccountMenu();
  const { disconnect } = useDisconnect();
  const [, copyToClipboard] = useCopyToClipboard();
  const [showCopied, setShowCopied] = useState(false);
  const pathname = usePathname();

  // Only show Settings on /bridge route
  const isBridgeRoute = pathname.startsWith('/bridge');

  // Open bridge settings sidebar
  const handleSettingsClick = () => {
    setQueryParams({ settingsOpen: true });
  };

  // Use account from hook if available, otherwise fallback to prop
  const displayAddress = address || account.address;
  const displayAvatar = ensAvatar;

  // Format address for display (Oxed...efsx format)
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

  // Reusable avatar component
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
          <Popover.Button className="flex items-center gap-2 rounded-md bg-gray-8 px-3 py-2 text-sm text-white transition-colors hover:bg-gray-8/80 ui-open:bg-gray-8/90">
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
            {/* Wallet address section at top */}
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

            {/* Menu items - no separators, spacing achieved through padding */}
            {explorerUrl && (
              <button
                onClick={() => window.open(explorerUrl, '_blank', 'noopener,noreferrer')}
                className={MENU_ITEM_BUTTON_CLASSES}
              >
                <ArrowTopRightOnSquareIcon className={twMerge(ICON_CLASSES, 'text-white')} />
                <span>Explorer</span>
              </button>
            )}

            {/* Bridge Dev Tools (opens bridge settings sidebar) - Only visible on /bridge route */}
            {isBridgeRoute && (
              <button onClick={handleSettingsClick} className={MENU_ITEM_BUTTON_CLASSES}>
                <CodeBracketIcon className={twMerge(ICON_CLASSES, 'text-white')} />
                <span>Bridge Dev Tools</span>
              </button>
            )}

            {/* Disconnect */}
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
