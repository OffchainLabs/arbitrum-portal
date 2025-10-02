import { useArbQueryParams } from '../../hooks/useArbQueryParams';
import { useMode } from '../../hooks/useMode';
import { BuyPanel } from '../BuyPanel';
import { RecoverFunds } from '../RecoverFunds';
import { TopNavBar } from '../TopNavBar';
import { TransactionHistory } from '../TransactionHistory/TransactionHistory';
import { TransferPanel } from '../TransferPanel/TransferPanel';
import { SettingsDialog } from '../common/SettingsDialog';
import { useBalanceUpdater } from '../syncers/useBalanceUpdater';
import { ArbitrumStats, statsLocalStorageKey } from './ArbitrumStats';
import { BUY_PATHNAME } from '@/bridge/constants';
import { isOnrampEnabled } from '@/bridge/util/featureFlag';
import { TabGroup, TabPanel, TabPanels } from '@headlessui/react';
import { useLocalStorage } from '@uidotdev/usehooks';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Fragment } from 'react';

export function MainContent() {
  const pathname = usePathname();
  const [isArbitrumStatsVisible] =
    useLocalStorage<boolean>(statsLocalStorageKey);
  const [{ tab }, setQueryParams] = useArbQueryParams();
  const showBuyPanel = isOnrampEnabled();

  useBalanceUpdater();

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
              {/* this is for the transfer panel and tx history tab panels to switch correctly because we have 3 tabs when buy is enabled */}
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
