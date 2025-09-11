import { twMerge } from 'tailwind-merge'
import {
  ChevronDownIcon,
  PaperAirplaneIcon,
  WalletIcon,
  CheckIcon
} from '@heroicons/react/24/outline'
import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react'
import { useCallback } from 'react'

import { Button } from '../common/Button'
import { Transition } from '../common/Transition'
import {
  useArbQueryParams,
  TabParamEnum,
  indexToTab
} from '../../hooks/useArbQueryParams'
import { isOnrampEnabled } from '../../util/featureFlag'

interface ModeOptionProps {
  icon: React.ReactNode
  label: string
  isSelected: boolean
  onClick: () => void
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
  )
}

export const WidgetModeDropdown = () => {
  const [{ tab }, setQueryParams] = useArbQueryParams()
  const showBuyPanel = isOnrampEnabled()

  const currentTab =
    indexToTab[tab as keyof typeof indexToTab] || TabParamEnum.BRIDGE

  const handleModeChange = useCallback(
    (newTab: TabParamEnum) => {
      const newTabIndex = newTab === TabParamEnum.BUY ? 0 : showBuyPanel ? 1 : 0
      setQueryParams({ tab: newTabIndex })
    },
    [setQueryParams, showBuyPanel]
  )

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
    )
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
                {currentTab === TabParamEnum.BUY ? (
                  <WalletIcon className="h-3 w-3" />
                ) : (
                  <PaperAirplaneIcon className="h-3 w-3" />
                )}
                {currentTab === TabParamEnum.BUY ? 'Buy' : 'Bridge'}
                <ChevronDownIcon
                  className={twMerge(
                    'h-3 w-3 opacity-30 transition-all',
                    open && 'rotate-180'
                  )}
                />
              </div>
            </Button>
          </PopoverButton>
          <Transition>
            <PopoverPanel className="absolute left-0 top-0 z-10 w-[150px] origin-top overflow-hidden rounded-md text-sm text-white">
              <div className="flex w-full flex-col gap-1 rounded-lg border border-white/20 bg-dark p-2">
                <ModeOption
                  icon={<PaperAirplaneIcon className="h-3 w-3" />}
                  label="Bridge"
                  isSelected={currentTab === TabParamEnum.BRIDGE}
                  onClick={() => {
                    handleModeChange(TabParamEnum.BRIDGE)
                    close()
                  }}
                />
                <ModeOption
                  icon={<WalletIcon className="h-3 w-3" />}
                  label="Buy"
                  isSelected={currentTab === TabParamEnum.BUY}
                  onClick={() => {
                    handleModeChange(TabParamEnum.BUY)
                    close()
                  }}
                />
              </div>
            </PopoverPanel>
          </Transition>
        </>
      )}
    </Popover>
  )
}
