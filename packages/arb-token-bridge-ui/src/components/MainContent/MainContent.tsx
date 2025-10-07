import { TabGroup, TabPanel, TabPanels } from '@headlessui/react';
import { useLocalStorage } from '@uidotdev/usehooks';
import { usePathname } from 'next/navigation';
import { Fragment, useMemo } from 'react';

import { PathnameEnum } from '@/bridge/constants';
import { isOnrampFeatureEnabled } from '@/bridge/util/queryParamUtils';

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

export function MainContent() {
  const pathname = usePathname();
  const [isArbitrumStatsVisible] = useLocalStorage<boolean>(statsLocalStorageKey);
  const [{ tab, disabledFeatures }] = useArbQueryParams();
  const showBuyPanel = isOnrampFeatureEnabled({ disabledFeatures });

  const selectedTab = useMemo(() => {
    if (showBuyPanel) {
      // `tab` from useArbQueryParams will never be 0 when showBuyPanel is true
      // because we use /buy and don't use ?tab=buy
      // so we need to hardcode to return 0 rather than `tab`
      if (pathname === PathnameEnum.BUY) {
        return 0;
      }
      return tab;
    }
    return Math.max(0, tab - 1);
  }, [showBuyPanel, tab, pathname]);

  useBalanceUpdater();

  const { embedMode } = useMode();

  if (embedMode) {
    return <TransferPanel />;
  }

  return (
    <>
      <RecoverFunds />

      <div className="main-panel mx-auto flex w-full flex-col items-center gap-4 sm:pt-6">
        <TabGroup manual as={Fragment} selectedIndex={selectedTab} onChange={() => {}}>
          <TopNavBar />

          <TabPanels className="flex w-full items-center justify-center">
            {showBuyPanel && (
              <TabPanel className="w-full sm:max-w-[580px]">
                <BuyPanel />
              </TabPanel>
            )}
            <TabPanel className="w-full sm:max-w-[580px]">
              <TransferPanel />
            </TabPanel>
            <TabPanel className="w-full md:px-4">
              <TransactionHistory />
            </TabPanel>
          </TabPanels>
        </TabGroup>
      </div>

      {/* Settings panel */}
      <SettingsDialog />

      {/* Toggle-able Stats for nerds */}
      {isArbitrumStatsVisible && <ArbitrumStats />}
    </>
  );
}
