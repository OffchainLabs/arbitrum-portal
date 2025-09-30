import { useLocalStorage } from '@uidotdev/usehooks'
import { TabGroup, TabPanel, TabPanels } from '@headlessui/react'
import { useCallback, Fragment } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import { TransferPanel } from '../TransferPanel/TransferPanel'
import { ArbitrumStats, statsLocalStorageKey } from './ArbitrumStats'
import { SettingsDialog } from '../common/SettingsDialog'
import { TransactionHistory } from '../TransactionHistory/TransactionHistory'
import { TopNavBar } from '../TopNavBar'
import { useBalanceUpdater } from '../syncers/useBalanceUpdater'
import { useArbQueryParams } from '../../hooks/useArbQueryParams'
import { useMode } from '../../hooks/useMode'
import { RecoverFunds } from '../RecoverFunds'
import { BuyPanel } from '../BuyPanel'
import { BUY_PATHNAME } from '@/bridge/constants'
import { isOnrampEnabled } from '@/bridge/util/featureFlag'

export function MainContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const [isArbitrumStatsVisible] =
    useLocalStorage<boolean>(statsLocalStorageKey)
  const [{ tab }, setQueryParams] = useArbQueryParams()

  const setSelectedTab = useCallback(
    (index: number) => {
      console.log('setSelectedTab: ', index)
      if (index === -1) {
        // Buy tab is selected, but we don't set it in query params
        router.push(`${BUY_PATHNAME}?${searchParams.toString()}`)
      } else {
        setQueryParams({ tab: index + 1 })
      }
    },
    [setQueryParams],
  );
  const showBuyPanel = isOnrampEnabled()

  useBalanceUpdater()

  const { embedMode } = useMode();

  if (embedMode) {
    return <TransferPanel />;
  }

  return (
    <>
      <RecoverFunds />

      <div className="main-panel mx-auto flex w-full flex-col items-center gap-3 sm:pt-6">
        <TabGroup
          manual
          as={Fragment}
          selectedIndex={showBuyPanel ? tab : tab - 1}
          onChange={() => {}}
        >
          <TopNavBar />

          {pathname === BUY_PATHNAME && showBuyPanel ? (
            <BuyPanel />
          ) : (
            <TabPanels className="flex w-full items-center justify-center">
              {showBuyPanel && (
                <TabPanel className="w-full sm:max-w-[600px]"></TabPanel>
              )}
              <TabPanel className="w-full sm:max-w-[600px]">
                <TransferPanel />
              </TabPanel>
              <TabPanel className="w-full md:px-4">
                <TransactionHistory />
              </TabPanel>
            </TabPanels>
          )}
        </TabGroup>
      </div>

      {/* Settings panel */}
      <SettingsDialog />

      {/* Toggle-able Stats for nerds */}
      {isArbitrumStatsVisible && <ArbitrumStats />}
    </>
  );
}
