import { ChevronDownIcon } from '@heroicons/react/24/outline';
import { ExclamationCircleIcon } from '@heroicons/react/24/solid';
import { BigNumber, utils } from 'ethers';
import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import React, { PropsWithChildren, memo, useMemo } from 'react';
import { twMerge } from 'tailwind-merge';
import { Chain } from 'viem';
import { useAccount, useBalance } from 'wagmi';
import { create } from 'zustand';
import { shallow } from 'zustand/shallow';

import { getProviderForChainId } from '@/token-bridge-sdk/utils';

import { useETHPrice } from '../../hooks/useETHPrice';
import { useMode } from '../../hooks/useMode';
import { useNativeCurrency } from '../../hooks/useNativeCurrency';
import { ChainId } from '../../types/ChainId';
import { formatAmount, formatUSD } from '../../util/NumberUtils';
import { isOnrampEnabled, isOnrampServiceEnabled } from '../../util/featureFlag';
import { getNetworkName } from '../../util/networks';
import { TokenLogoFallback } from '../TransferPanel/TokenInfo';
import { Button } from '../common/Button';
import { Dialog } from '../common/Dialog';
import { DialogProps, DialogWrapper, useDialog2 } from '../common/Dialog2';
import { NetworkImage } from '../common/NetworkImage';
import { NetworksPanel } from '../common/NetworkSelectionContainer';
import { SafeImage } from '../common/SafeImage';
import { SearchPanel } from '../common/SearchPanel/SearchPanel';
import { Loader } from '../common/atoms/Loader';
import { Homepage } from './Homepage';
import { LinkoutOnrampPanel } from './LinkoutOnrampPanel';
import { MoonPayPanel, MoonPaySkeleton } from './MoonPayPanel';
import { onrampServices } from './utils';

const MoonPayProvider = dynamic(
  () => import('@moonpay/moonpay-react').then((mod) => mod.MoonPayProvider),
  {
    ssr: false,
    loading: () => <MoonPaySkeleton />,
  },
);

const isMoonPayEnabled = isOnrampServiceEnabled('moonpay');

function OnRampProviders({ children }: PropsWithChildren) {
  if (!isOnrampEnabled()) {
    return children;
  }

  if (!isMoonPayEnabled) {
    return children;
  }

  const moonPayApiKey = process.env.NEXT_PUBLIC_MOONPAY_PK;

  if (typeof moonPayApiKey === 'undefined') {
    throw new Error('NEXT_PUBLIC_MOONPAY_PK variable missing.');
  }

  return <MoonPayProvider apiKey={moonPayApiKey}>{children}</MoonPayProvider>;
}

const moonPayChainIds = [ChainId.Ethereum, ChainId.ArbitrumOne];

type BuyPanelStore = {
  selectedChainId: ChainId;
  setSelectedChainId: (chainId: ChainId) => void;
};

export const useBuyPanelStore = create<BuyPanelStore>()((set) => ({
  selectedChainId: ChainId.ArbitrumOne,
  setSelectedChainId: (chainId: ChainId) => set(() => ({ selectedChainId: chainId })),
}));

export const BuyPanelNetworkSelectionContainer = React.memo(
  (props: DialogProps & { isOpen: boolean }) => {
    const { embedMode } = useMode();
    const { selectedChainId, setSelectedChainId } = useBuyPanelStore(
      (state) => ({
        selectedChainId: state.selectedChainId,
        setSelectedChainId: state.setSelectedChainId,
      }),
      shallow,
    );

    return (
      <Dialog
        isOpen={props.isOpen}
        onClose={() => {
          props.onClose(false);
        }}
        title={`Select Network`}
        actionButtonProps={{ hidden: true }}
        isFooterHidden={true}
        className={twMerge(
          'h-screen overflow-hidden md:h-[calc(100vh_-_175px)] md:max-h-[900px] md:max-w-[500px]',
          embedMode && 'md:h-full',
        )}
      >
        <SearchPanel>
          <SearchPanel.MainPage className="flex h-full max-w-[500px] flex-col py-4">
            <NetworksPanel
              chainIds={moonPayChainIds}
              selectedChainId={selectedChainId}
              close={() => props.onClose(false)}
              onNetworkRowClick={(chain: Chain) => {
                setSelectedChainId(chain.id);
                props.onClose(false);
              }}
              showSearch={false}
              showFooter={false}
            />
          </SearchPanel.MainPage>
        </SearchPanel>
      </Dialog>
    );
  },
);

BuyPanelNetworkSelectionContainer.displayName = 'BuyPanelNetworkSelectionContainer';

function BuyPanelNetworkButton({
  onClick,
}: {
  onClick: React.MouseEventHandler<HTMLButtonElement>;
}) {
  const selectedChainId = useBuyPanelStore((state) => state.selectedChainId);

  return (
    <Button variant="secondary" onClick={onClick} className="border-gray-8">
      <div className="flex flex-nowrap items-center gap-1 text-lg leading-[1.1]">
        <NetworkImage chainId={selectedChainId} className="h-4 w-4 p-[2px]" size={20} />
        {getNetworkName(selectedChainId)}
        <ChevronDownIcon width={12} />
      </div>
    </Button>
  );
}

const BalanceWrapper = memo(function BalanceWrapper() {
  const { address, isConnected } = useAccount();
  const { ethToUSD } = useETHPrice();
  const selectedChainId = useBuyPanelStore((state) => state.selectedChainId);
  const provider = getProviderForChainId(selectedChainId);
  const nativeCurrency = useNativeCurrency({ provider });
  const {
    data: balanceState,
    isLoading: isLoadingBalance,
    error: balanceError,
  } = useBalance({ chainId: selectedChainId, address });
  const showPriceInUsd = nativeCurrency.symbol.toLowerCase() === 'eth';
  const balanceInUsd = useMemo(() => {
    if (!balanceState || !showPriceInUsd) {
      return null;
    }
    return ethToUSD(Number(utils.formatEther(BigNumber.from(balanceState.value))));
  }, [balanceState, ethToUSD, showPriceInUsd]);
  const isBalanceLessThan15Usd = Number(balanceInUsd) < 15;
  const [dialogProps, openDialog] = useDialog2();
  const openBuyPanelNetworkSelectionDialog = () => {
    openDialog('buy_panel_network_selection');
  };

  if (!isConnected) {
    return null;
  }

  return (
    <div className="my-6 flex flex-col items-center justify-center gap-3 text-center">
      <BuyPanelNetworkButton onClick={openBuyPanelNetworkSelectionDialog} />
      <p className="flex items-center justify-center space-x-1 text-lg">
        <span>Balance:</span>
        {typeof balanceState !== 'undefined' && (
          <>
            <SafeImage
              width={20}
              height={20}
              src={nativeCurrency.logoUrl}
              alt={nativeCurrency.symbol}
              className="!ml-2 block"
              fallback={<TokenLogoFallback className="h-4 w-4" />}
            />
            <span>
              {formatAmount(BigNumber.from(balanceState.value), {
                decimals: balanceState.decimals,
                symbol: balanceState.symbol,
              })}
            </span>
          </>
        )}
        {isLoadingBalance && <Loader size="small" />}
        {!isLoadingBalance && (balanceError || typeof balanceState === 'undefined') && (
          <span className="text-error">Failed to load balance.</span>
        )}
        {balanceInUsd && <span className="text-white/50">{formatUSD(balanceInUsd)}</span>}
      </p>

      {isBalanceLessThan15Usd && (
        <p className="text-sm p-2 rounded-sm bg-white/10 flex gap-2 items-center justify-center leading-none">
          <ExclamationCircleIcon className="w-3 h-3" />
          <span>Low wallet balance</span>
        </p>
      )}

      <DialogWrapper {...dialogProps} />
    </div>
  );
});

function OnrampDisclaimer() {
  const { embedMode } = useMode();

  return (
    <p className={twMerge('text-gray-4 mt-auto pt-4 text-center text-sm', embedMode && 'text-xs')}>
      On-Ramps are not endorsed by Arbitrum. Please use at your own risk.
    </p>
  );
}

function OnrampServicePanel() {
  const pathname = usePathname();
  const onrampService = pathname.split('/').pop();
  const allOnrampServices = onrampServices.map((service) => service.slug);

  switch (onrampService) {
    case 'moonpay':
      if (!isMoonPayEnabled) {
        return null;
      }
      return <MoonPayPanel />;
    case allOnrampServices.find((service) => service === onrampService):
      return <LinkoutOnrampPanel serviceSlug={onrampService!} />;
    default:
      return <Homepage />;
  }
}

export function BuyPanel() {
  const { embedMode } = useMode();

  return (
    <div
      className={twMerge(
        'bg-gray-1 rounded-md border border-white/30 px-6 py-7 pb-8 text-white w-full sm:max-w-[600px] min-h-[600px] flex flex-col',
        embedMode && 'mx-auto max-w-[540px]',
      )}
    >
      <BalanceWrapper />

      <OnRampProviders>
        <OnrampServicePanel />
      </OnRampProviders>

      <OnrampDisclaimer />
    </div>
  );
}
