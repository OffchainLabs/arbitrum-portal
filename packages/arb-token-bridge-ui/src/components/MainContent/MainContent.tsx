import { useLocalStorage } from '@uidotdev/usehooks';
import { usePathname, useSearchParams } from 'next/navigation';

import { isBridgeBuyOrSubpages } from '@/bridge/util/pathnameUtils';
import { TabParamEnum, isOnrampFeatureEnabled } from '@/bridge/util/queryParamUtils';

import { useArbQueryParams } from '../../hooks/useArbQueryParams';
import { useMode } from '../../hooks/useMode';
import { BuyPanel } from '../BuyPanel/BuyPanel';
import { RecoverFunds } from '../RecoverFunds';
import { TransactionHistory } from '../TransactionHistory/TransactionHistory';
import { TransferPanel } from '../TransferPanel/TransferPanel';
import { SettingsDialog } from '../common/SettingsDialog';
import { useBalanceUpdater } from '../syncers/useBalanceUpdater';
import { ArbitrumStats, statsLocalStorageKey } from './ArbitrumStats';

export function MainContent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isArbitrumStatsVisible] = useLocalStorage<boolean>(statsLocalStorageKey);
  const [{ disabledFeatures }] = useArbQueryParams();
  const showBuyPanel = isOnrampFeatureEnabled({ disabledFeatures });

  useBalanceUpdater();

  const { embedMode } = useMode();

  if (embedMode) {
    return <TransferPanel />;
  }

  // Determine which content to show based on route and query params
  const isBuyPage = showBuyPanel && isBridgeBuyOrSubpages(pathname);
  const isTxHistory = searchParams.get('tab') === TabParamEnum.TX_HISTORY;

  return (
    <>
      <RecoverFunds />

      <div className="main-panel mx-auto flex w-full flex-col items-center gap-3 sm:pt-6">
        <div className="flex w-full items-center justify-center mb-8 md:mb-16 px-2">
          {isBuyPage ? (
            <div className="w-full sm:max-w-[600px]">
              <BuyPanel />
            </div>
          ) : isTxHistory ? (
            <div className="w-full md:px-4">
              <TransactionHistory />
            </div>
          ) : (
            <div className="w-full sm:max-w-[600px]">
              <TransferPanel />
            </div>
          )}
        </div>
      </div>

      {/* Settings panel */}
      <SettingsDialog />

      {/* Toggle-able Stats for nerds */}
      {isArbitrumStatsVisible && <ArbitrumStats />}
    </>
  );
}
