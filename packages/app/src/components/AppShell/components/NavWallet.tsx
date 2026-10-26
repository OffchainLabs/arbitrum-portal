'use client';

import { Popover } from '@headlessui/react';
import {
  ArrowLeftOnRectangleIcon,
  ArrowTopRightOnSquareIcon,
  CheckIcon,
  ChevronDownIcon,
  CodeBracketIcon,
  DocumentDuplicateIcon,
  WalletIcon,
} from '@heroicons/react/24/outline';
import { usePathname } from 'next/navigation';
import { useContext, useState } from 'react';
import { useCopyToClipboard } from 'react-use';
import { twMerge } from 'tailwind-merge';

import { CustomBoringAvatar } from '@/bridge/components/common/CustomBoringAvatar';
import { SafeImage } from '@/bridge/components/common/SafeImage';
import { useAccountMenu } from '@/bridge/hooks/useAccountMenu';
import { useArbQueryParams } from '@/bridge/hooks/useArbQueryParams';
import { getAccountExplorerUrl } from '@/bridge/util/networks';
import { WalletContext } from '@/bridge/wallet/WalletContext';
import { ecosystems } from '@/bridge/wallet/ecosystems';
import { useWalletModal } from '@/bridge/wallet/hooks/useWalletModal';
import { useWallets } from '@/bridge/wallet/hooks/useWallets';
import type { WalletEcosystem, WalletHandle } from '@/bridge/wallet/types';

const MENU_ITEM_BUTTON_CLASSES =
  'opacity-70 hover:opacity-100 flex items-center gap-2 rounded-sm px-2 py-2 text-sm text-white cursor-pointer transition-colors hover:bg-neutral-25/50 focus:bg-neutral-25/50 w-full';
const ICON_CLASSES = 'h-4 w-4 shrink-0';
const AVATAR_CLASSES = 'h-6 w-6 rounded-full shrink-0';

interface WalletConnectedDropdownProps {
  wallet: WalletHandle;
  /** Ecosystems whose wallet can still be connected */
  connectableEcosystems: WalletEcosystem[];
}

function WalletConnectedDropdown({ wallet, connectableEcosystems }: WalletConnectedDropdownProps) {
  const { address, accountShort, ensName, ensAvatar, udInfo, setQueryParams } =
    useAccountMenu(wallet);
  const {
    account: { address: walletAddress = '', chainId },
    disconnect,
  } = wallet;
  const { openConnectModalFor } = useWalletModal();
  const [, copyToClipboard] = useCopyToClipboard();
  const [showCopied, setShowCopied] = useState(false);
  const pathname = usePathname();
  const isBridgeRoute = pathname.startsWith('/bridge');

  const handleSettingsClick = () => {
    setQueryParams({ settingsOpen: true });
  };

  const displayAddress = address || walletAddress;
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
    chainId && displayAddress ? getAccountExplorerUrl(chainId, displayAddress) : null;

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

            {connectableEcosystems.map((ecosystem) => (
              <button
                key={ecosystem}
                onClick={() => openConnectModalFor(ecosystem)}
                className={MENU_ITEM_BUTTON_CLASSES}
              >
                <WalletIcon className={twMerge(ICON_CLASSES, 'text-white')} />
                <span>Connect {ecosystems[ecosystem].name} wallet</span>
              </button>
            ))}

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
                <span>Developer Tools</span>
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

function WalletRow({ wallet }: { wallet: WalletHandle }) {
  const {
    ecosystem,
    account: { address = '', walletInfo },
    disconnect,
  } = wallet;
  const [, copyToClipboard] = useCopyToClipboard();
  const [showCopied, setShowCopied] = useState(false);
  const { name: ecosystemName } = ecosystems[ecosystem];

  function copy() {
    setShowCopied(true);
    copyToClipboard(address);
    setTimeout(() => setShowCopied(false), 1000);
  }

  return (
    <div className="flex items-center gap-2 px-2 py-2.5">
      <SafeImage
        src={walletInfo?.icon}
        alt={walletInfo?.name}
        className={AVATAR_CLASSES}
        fallback={<CustomBoringAvatar size={24} name={address} />}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <button
          onClick={copy}
          className="flex items-center gap-1 text-left text-sm text-white"
          aria-label={`Copy ${ecosystemName} address`}
        >
          <span>{`${address.slice(0, 4)}...${address.slice(-4)}`}</span>
          {showCopied ? (
            <CheckIcon className="h-3 w-3 shrink-0 text-gray-5" />
          ) : (
            <DocumentDuplicateIcon className="h-3 w-3 shrink-0 text-gray-5" />
          )}
        </button>
        {walletInfo?.name && <span className="text-xs text-gray-5">{walletInfo.name}</span>}
      </div>
      <span className="text-xs text-gray-5">{ecosystemName}</span>
      <button
        onClick={() => disconnect()}
        className="opacity-70 hover:opacity-100"
        aria-label={`Disconnect ${ecosystemName} wallet`}
      >
        <ArrowLeftOnRectangleIcon className={twMerge(ICON_CLASSES, 'text-white')} />
      </button>
    </div>
  );
}

/** Shown when wallets of several ecosystems are connected */
function WalletsConnectedDropdown({ wallets }: { wallets: WalletHandle[] }) {
  const [, setQueryParams] = useArbQueryParams();
  const pathname = usePathname();
  const isBridgeRoute = pathname.startsWith('/bridge');
  const {
    sourceWallet: {
      account: { address: sourceAddress, chainId: sourceChainId },
    },
  } = useWallets();
  const explorerUrl =
    sourceAddress && sourceChainId ? getAccountExplorerUrl(sourceChainId, sourceAddress) : null;

  return (
    <Popover className="relative">
      {({ open }) => (
        <>
          <Popover.Button className="flex items-center gap-2 rounded-md bg-neutral-25 px-2 py-2 text-sm text-white transition-colors hover:bg-neutral-25/80 ui-open:bg-neutral-25/90">
            <span className="flex -space-x-2">
              {wallets.map(({ ecosystem, account: { address, walletInfo } }) => (
                <SafeImage
                  key={ecosystem}
                  src={walletInfo?.icon}
                  alt={walletInfo?.name}
                  className={AVATAR_CLASSES}
                  fallback={<CustomBoringAvatar size={24} name={address} />}
                />
              ))}
            </span>
            <span className="text-sm hidden md:block">My wallets</span>
            <ChevronDownIcon
              className={twMerge(
                ICON_CLASSES,
                'transition-transform hidden md:block',
                open && 'rotate-180',
              )}
            />
          </Popover.Button>

          <Popover.Panel className="absolute right-0 top-[0px] z-50 w-72 rounded-md border-0 bg-gray-1 p-3 shadow-lg">
            {wallets.map((wallet) => (
              <WalletRow key={wallet.ecosystem} wallet={wallet} />
            ))}

            <hr className="my-1 border-gray-8" />

            {isBridgeRoute && (
              <button
                onClick={() => setQueryParams({ settingsOpen: true })}
                className={MENU_ITEM_BUTTON_CLASSES}
              >
                <CodeBracketIcon className={twMerge(ICON_CLASSES, 'text-white')} />
                <span>Developer Tools</span>
              </button>
            )}

            {explorerUrl && (
              <button
                onClick={() => window.open(explorerUrl, '_blank', 'noopener,noreferrer')}
                className={MENU_ITEM_BUTTON_CLASSES}
              >
                <ArrowTopRightOnSquareIcon className={twMerge(ICON_CLASSES, 'text-white')} />
                <span>Explorer</span>
              </button>
            )}
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
      className="rounded-md bg-primary-cta px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-cta/80 whitespace-nowrap"
    >
      Connect Wallet
    </button>
  );
}

export function NavWallet() {
  const wallets = useContext(WalletContext);
  const { openConnectModal } = useWalletModal();
  // EVM first, as in the design
  const enabledEcosystems = (Object.keys(ecosystems) as WalletEcosystem[]).filter((ecosystem) =>
    ecosystems[ecosystem].isEnabled(),
  );
  const connectedWallets = enabledEcosystems
    .map((ecosystem) => wallets[ecosystem])
    .filter((wallet) => wallet.isConnected && wallet.account.address);
  const [connectedWallet] = connectedWallets;

  if (connectedWallets.length > 1) {
    return <WalletsConnectedDropdown wallets={connectedWallets} />;
  }

  if (connectedWallet) {
    return (
      <WalletConnectedDropdown
        wallet={connectedWallet}
        connectableEcosystems={enabledEcosystems.filter(
          (ecosystem) => ecosystem !== connectedWallet.ecosystem,
        )}
      />
    );
  }

  return <WalletDisconnectedButton openConnectModal={openConnectModal} />;
}
