import { useLocalStorage } from '@uidotdev/usehooks'
import { Tab, TabGroup, TabPanels } from '@headlessui/react'
import { useCallback, Fragment } from 'react'
import { usePathname } from 'next/navigation'

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

export function MainContent() {
  const pathname = usePathname()
  const [isArbitrumStatsVisible] =
    useLocalStorage<boolean>(statsLocalStorageKey)
  const [{ tab }, setQueryParams] = useArbQueryParams()

  const setSelectedTab = useCallback(
    (index: number) => {
      setQueryParams({ tab: index });
    },
    [setQueryParams],
  );

  const onTabSelected = useCallback(
    (index: number) => {
      console.log('onTabSelected index:', index)
      setSelectedTab(index)
    },
    [setSelectedTab]
  )

  useBalanceUpdater()

  const { embedMode } = useMode();

  if (embedMode) {
    return <TransferPanel />;
  }

  return (
    <>
      <RecoverFunds />

      <div className="main-panel mx-auto flex w-full flex-col items-center gap-3 sm:pt-6">
        <TabGroup as={Fragment} selectedIndex={tab} onChange={onTabSelected}>
          <TopNavBar />
          {pathname === BUY_PATHNAME ? (
            <BuyPanel />
          ) : (
            <TabPanels className="flex w-full items-center justify-center">
              <Tab.Panel className="w-full sm:max-w-[600px]">
                <TransferPanel />
              </Tab.Panel>
              <Tab.Panel className="w-full md:px-4">
                <TransactionHistory />
              </Tab.Panel>
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
