'use client';

import { Popover } from '@headlessui/react';
import {
  ArrowLeftOnRectangleIcon,
  ArrowTopRightOnSquareIcon,
  ChevronDownIcon,
  DocumentDuplicateIcon,
} from '@heroicons/react/24/outline';
import { type Account, type Chain } from '@rainbow-me/rainbowkit';
import { useDisconnect } from 'wagmi';
import { useCopyToClipboard } from 'react-use';
import { useState } from 'react';
import { useAccountMenu } from '@/bridge/hooks/useAccountMenu';
import { getExplorerUrl } from '@/bridge/util/networks';
import { CustomBoringAvatar } from '@/bridge/components/common/CustomBoringAvatar';
import { SafeImage } from '@/bridge/components/common/SafeImage';
import { ExternalLink } from '@/bridge/components/common/ExternalLink';

// NavWalletConnected - Connected wallet display with dropdown
interface NavWalletConnectedProps {
  account: Account;
  chain: Chain;
  openAccountModal: () => void;
}

export function NavWalletConnected({ account, chain, openAccountModal }: NavWalletConnectedProps) {
  // Use useAccountMenu hook for ENS/UD data (safe because ConnectButton.Custom only renders within WagmiProvider)
  const { address, accountShort, ensName, ensAvatar, udInfo } = useAccountMenu();
  const { disconnect } = useDisconnect();
  const [, copyToClipboard] = useCopyToClipboard();
  const [showCopied, setShowCopied] = useState(false);

  // Use account from hook if available, otherwise fallback to prop
  const displayAddress = address || account.address;
  const truncatedAddress = displayAddress ? `${displayAddress.slice(0, 6)}...${displayAddress.slice(-4)}` : '';
  const displayName = ensName ?? udInfo?.name ?? accountShort ?? truncatedAddress;
  const displayAvatar = ensAvatar;

  function copy(value: string) {
    setShowCopied(true);
    copyToClipboard(value);
    setTimeout(() => setShowCopied(false), 1000);
  }

  const explorerUrl = chain && displayAddress ? `${getExplorerUrl(chain.id)}/address/${displayAddress}` : null;

  return (
    <Popover className="relative">
      {({ open }) => (
        <>
          <Popover.Button
            className="flex items-center gap-2 rounded-lg border border-gray-8 bg-gray-8 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-8/80 ui-open:bg-gray-8/90"
          >
            <SafeImage
              src={displayAvatar || undefined}
              className="h-6 w-6 rounded-full"
              fallback={<CustomBoringAvatar size={24} name={displayAddress} />}
            />
            <span className="text-sm">{displayName}</span>
            <ChevronDownIcon className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} />
          </Popover.Button>

          <Popover.Panel className="absolute right-0 top-full z-50 mt-2 w-56 rounded-lg border border-gray-8 bg-gray-1 p-2 shadow-lg">
            <div className="flex flex-col gap-1">
              {/* Copy address */}
              <button
                onClick={() => copy(displayAddress)}
                className="flex items-center gap-2 rounded px-3 py-2 text-sm text-white transition-colors hover:bg-gray-8"
              >
                <DocumentDuplicateIcon className="h-4 w-4" />
                <span>{showCopied ? 'Copied!' : 'Copy Address'}</span>
              </button>

              {/* Explorer link */}
              {explorerUrl && (
                <ExternalLink
                  href={explorerUrl}
                  className="flex items-center gap-2 rounded px-3 py-2 text-sm text-white transition-colors hover:bg-gray-8"
                >
                  <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                  <span>Explorer</span>
                </ExternalLink>
              )}

              {/* Account settings (opens RainbowKit modal) */}
              <button
                onClick={openAccountModal}
                className="flex items-center gap-2 rounded px-3 py-2 text-sm text-white transition-colors hover:bg-gray-8"
              >
                <span>Account Settings</span>
              </button>

              {/* Disconnect */}
              <button
                onClick={() => disconnect()}
                className="flex items-center gap-2 rounded px-3 py-2 text-sm text-white transition-colors hover:bg-gray-8"
              >
                <ArrowLeftOnRectangleIcon className="h-4 w-4" />
                <span>Disconnect</span>
              </button>
            </div>
          </Popover.Panel>
        </>
      )}
    </Popover>
  );
}
