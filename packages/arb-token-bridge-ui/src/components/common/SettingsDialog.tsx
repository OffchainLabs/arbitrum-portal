import useLocalStorage from '@rehooks/local-storage';
import { twMerge } from 'tailwind-merge';

import { RetryableRedeemer } from '@/app-components/RetryableRedeemer/RetryableRedeemer';

import { ORBIT_QUICKSTART_LINK } from '../../constants';
import { useArbQueryParams } from '../../hooks/useArbQueryParams';
import { statsLocalStorageKey } from '../MainContent/ArbitrumStats';
import { AddCustomChain } from './AddCustomChain';
import { ExternalLink } from './ExternalLink';
import { SidePanel } from './SidePanel';
import { Switch } from './atoms/Switch';

const SectionTitle = ({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) => <div className={twMerge('heading mb-4 text-lg', className)}>{children}</div>;

const SectionDivider = () => <hr className="w-full border-white/20" />;

export const SettingsDialog = () => {
  const [{ settingsOpen }, setQueryParams] = useArbQueryParams();

  const [isArbitrumStatsVisible, setIsArbitrumStatsVisible] =
    useLocalStorage<boolean>(statsLocalStorageKey);

  const openArbitrumStats = () => {
    setIsArbitrumStatsVisible(true);
  };

  const closeArbitrumStats = () => {
    setIsArbitrumStatsVisible(false);
  };

  function closeSettings() {
    setQueryParams({ settingsOpen: false });
  }

  return (
    <SidePanel
      isOpen={settingsOpen}
      heading="Settings"
      onClose={closeSettings}
      dialogWrapperClassName="z-[1001]"
      panelClassNameOverrides="lg:!w-[944px] !min-w-[350px]" // custom width
    >
      <div className="flex w-full flex-col items-center gap-6 text-white">
        {/* Arbitrum stats toggle */}
        <div className="w-full">
          <SectionTitle>Stats</SectionTitle>

          <Switch
            label="Show Network Stats"
            description="Live, nerdy stats about Ethereum and Arbitrum chains, like
        block number and current gas price."
            checked={!!isArbitrumStatsVisible}
            onChange={isArbitrumStatsVisible ? closeArbitrumStats : openArbitrumStats}
          />
        </div>

        <SectionDivider />

        {/* Redeem a stuck retryable ticket */}
        <div className="w-full">
          <SectionTitle className="mb-1">Redeem a Stuck Deposit</SectionTitle>
          <RetryableRedeemer />
        </div>

        <SectionDivider />

        {/* Add custom chain */}
        <div className="w-full transition-opacity">
          <SectionTitle className="mb-1">Add Custom Arbitrum Chain</SectionTitle>
          <p className="mb-4 text-sm">
            Add in your own Arbitrum chain to the bridge. This will only be for local testing, other
            users will not see it.
            <br />
            Learn more about how to create and add your Arbitrum Chain Testnet in{' '}
            <ExternalLink className="arb-hover underline" href={ORBIT_QUICKSTART_LINK}>
              Arbitrum Chain Quickstart
            </ExternalLink>
            .
          </p>

          <AddCustomChain />
        </div>

        <SectionDivider />
      </div>
    </SidePanel>
  );
};
