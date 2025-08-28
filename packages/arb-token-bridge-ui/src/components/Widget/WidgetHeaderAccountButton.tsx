import { useAccount, useDisconnect, useEnsAvatar, useEnsName } from 'wagmi'
import { twMerge } from 'tailwind-merge'
import {
  ArrowLeftEndOnRectangleIcon,
  ChevronDownIcon,
  DocumentDuplicateIcon,
  CheckIcon
} from '@heroicons/react/24/outline'
import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react'
import { useConnectModal } from '@rainbow-me/rainbowkit'
import { useState } from 'react'

import { Button } from '../common/Button'
import { shortenAddress } from '../../util/CommonUtils'
import { SafeImage } from '../common/SafeImage'
import { CustomBoringAvatar } from '../common/CustomBoringAvatar'
import { ChainId } from '../../types/ChainId'
import { Transition } from '../common/Transition'

interface AccountContentProps {
  showChevron?: boolean
  isOpen?: boolean
  showCopyButton?: boolean
  onCopy?: () => void
  isCopied?: boolean
}

const AccountContent = ({
  showChevron = false,
  isOpen = false,
  showCopyButton = false,
  onCopy,
  isCopied = false
}: AccountContentProps) => {
  const { address } = useAccount()
  const { data: ensName } = useEnsName({
    address,
    chainId: ChainId.Ethereum
  })

  const { data: ensAvatar } = useEnsAvatar({
    name: ensName ?? '',
    chainId: ChainId.Ethereum
  })

  return (
    <div className="flex items-center gap-2">
      <SafeImage
        src={ensAvatar || undefined}
        className="h-6 w-6 rounded-full"
        fallback={<CustomBoringAvatar size={24} name={address} />}
      />
      <span className="text-white">{shortenAddress(address ?? '')}</span>
      {showCopyButton && onCopy && (
        <>
          {isCopied ? (
            <CheckIcon className="h-3 w-3 text-green-500" />
          ) : (
            <DocumentDuplicateIcon className="h-3 w-3 text-white/50" />
          )}
        </>
      )}
      {showChevron && (
        <ChevronDownIcon
          className={twMerge('h-3 w-3 transition-all', isOpen && 'rotate-180')}
        />
      )}
    </div>
  )
}

export const WidgetHeaderAccountButton = () => {
  const { isConnected, address } = useAccount()
  const { openConnectModal } = useConnectModal()
  const { disconnect } = useDisconnect()
  const [isCopied, setIsCopied] = useState(false)

  const copyToClipboard = async () => {
    if (address) {
      await navigator.clipboard.writeText(address)
      setIsCopied(true)
      setTimeout(() => setIsCopied(false), 2000)
    }
  }

  return (
    <div className="flex items-center gap-2 text-base text-white">
      {isConnected && (
        <Popover className="relative">
          {({ open }) => (
            <>
              <PopoverButton as="div">
                <Button
                  variant="secondary"
                  className="h-[40px] px-[10px] py-[10px]"
                >
                  <AccountContent showChevron={true} isOpen={open} />
                </Button>
              </PopoverButton>
              <Transition>
                <PopoverPanel className="absolute right-0 top-0 z-10 origin-top overflow-hidden rounded-md text-sm text-white">
                  <div className="flex flex-col gap-2 rounded-lg border border-white/20 bg-dark p-2">
                    {/* Account name and copy */}
                    <Button
                      variant="secondary"
                      onClick={copyToClipboard}
                      className="border-none"
                    >
                      <AccountContent
                        showCopyButton={true}
                        onCopy={copyToClipboard}
                        isCopied={isCopied}
                      />
                    </Button>

                    {/* Disconnect button */}
                    <Button
                      variant="secondary"
                      className="flex w-full items-center justify-center border-none bg-white/5"
                      onClick={() => disconnect()}
                    >
                      <div className="flex items-center gap-2">
                        <ArrowLeftEndOnRectangleIcon className="h-3 w-3 text-white/70" />
                        <span>Disconnect</span>
                      </div>
                    </Button>
                  </div>
                </PopoverPanel>
              </Transition>
            </>
          )}
        </Popover>
      )}

      {!isConnected && (
        <Button
          variant="primary"
          className="flex h-[40px] w-full justify-between bg-primary-cta"
          onClick={openConnectModal}
        >
          <div>Connect Wallet</div>
        </Button>
      )}
    </div>
  )
}
