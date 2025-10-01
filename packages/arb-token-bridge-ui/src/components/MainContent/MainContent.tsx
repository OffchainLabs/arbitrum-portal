import { Tab } from '@headlessui/react';
import { useLocalStorage } from '@uidotdev/usehooks';
import { Fragment, useCallback } from 'react';

import { useArbQueryParams } from '../../hooks/useArbQueryParams';
import { useMode } from '../../hooks/useMode';
import { isOnrampEnabled } from '../../util/featureFlag';
import { BuyPanel } from '../BuyPanel';
import { RecoverFunds } from '../RecoverFunds';
import { TopNavBar } from '../TopNavBar';
import { TransactionHistory } from '../TransactionHistory/TransactionHistory';
import { TransferPanel } from '../TransferPanel/TransferPanel';
import { SettingsDialog } from '../common/SettingsDialog';
import { useBalanceUpdater } from '../syncers/useBalanceUpdater';
import { ArbitrumStats, statsLocalStorageKey } from './ArbitrumStats';

export function MainContent() {
  const [isArbitrumStatsVisible] = useLocalStorage<boolean>(statsLocalStorageKey);
  const [{ tab }, setQueryParams] = useArbQueryParams();
  const showBuyPanel = isOnrampEnabled();

  const setSelectedTab = useCallback(
    (index: number) => {
      setQueryParams({ tab: index });
    },
    [setQueryParams],
  );

  useBalanceUpdater();

  const { embedMode } = useMode();

  if (embedMode) {
    return <TransferPanel />;
  }

  return (
    <>
      <RecoverFunds />

      <div className="main-panel mx-auto flex w-full flex-col items-center gap-3 sm:pt-6">
        <Tab.Group as={Fragment} selectedIndex={tab} onChange={setSelectedTab}>
          <TopNavBar />
          <Tab.Panels className="flex w-full items-center justify-center">
            {showBuyPanel && (
              <Tab.Panel className="w-full sm:max-w-[600px]">
                <BuyPanel />
              </Tab.Panel>
            )}
            <Tab.Panel className="w-full sm:max-w-[600px]">
              <TransferPanel />
            </Tab.Panel>
            <Tab.Panel className="w-full md:px-4">
              <TransactionHistory />
            </Tab.Panel>
          </Tab.Panels>
        </Tab.Group>
      </div>

      {/* Settings panel */}
      <SettingsDialog />

      {/* Toggle-able Stats for nerds */}
      {isArbitrumStatsVisible && <ArbitrumStats />}
    </>
  );
}
