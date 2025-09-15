import dynamic from 'next/dynamic'
import Image from 'next/image'
import { useAccount, useBalance } from 'wagmi'
import React, { memo, PropsWithChildren, useCallback } from 'react'
import { twMerge } from 'tailwind-merge'
import { create } from 'zustand'
import { shallow } from 'zustand/shallow'
import { Chain } from 'viem'
import { BigNumber, utils } from 'ethers'
import { ChevronDownIcon } from '@heroicons/react/24/outline'

import MoonPay from '@/images/onramp/moonpay.svg'

import { getAPIBaseUrl } from '../util'
import { useNativeCurrency } from '../hooks/useNativeCurrency'
import { getProviderForChainId } from '@/token-bridge-sdk/utils'
import { ChainId } from '../types/ChainId'
import { SafeImage } from './common/SafeImage'
import { formatAmount, formatUSD } from '../util/NumberUtils'
import { NetworksPanel } from './common/NetworkSelectionContainer'
import { Button } from './common/Button'
import { NetworkImage } from './common/NetworkImage'
import { getNetworkName } from '../util/networks'
import { Dialog } from './common/Dialog'
import { useMode } from '../hooks/useMode'
import { SearchPanel } from './common/SearchPanel/SearchPanel'
import { DialogProps, DialogWrapper, useDialog2 } from './common/Dialog2'
import { useETHPrice } from '../hooks/useETHPrice'
import { Loader } from './common/atoms/Loader'
import { isOnrampEnabled, isOnrampServiceEnabled } from '../util/featureFlag'
import { TokenLogoFallback } from './TransferPanel/TokenInfo'

function MoonPaySkeleton({ children }: PropsWithChildren) {
  const { embedMode } = useMode()

  return (
    <div
      className={twMerge(
        'relative flex h-full w-full flex-col items-center justify-center overflow-hidden bg-gray-8 p-4 pt-5 text-white md:rounded-lg'
      )}
    >
      <div className="absolute left-0 top-0 h-[120px] w-full bg-[url('/images/gray_square_background.svg')]"></div>
      <div className="absolute left-1/2 top-[55px] h-[282px] w-[602px] shrink-0 -translate-x-1/2 bg-eclipse"></div>
      <div className="relative mb-4 flex flex-col items-center justify-center">
        <Image
          src={MoonPay}
          alt="MoonPay"
          width={embedMode ? 45 : 65}
          height={embedMode ? 45 : 65}
        />
        <p className={twMerge('mt-2 text-3xl', embedMode && 'text-xl')}>
          MoonPay
        </p>
        <p className={twMerge('mt-1 text-xl', embedMode && 'text-sm')}>
          PayPal, Debit Card, Apple Pay
        </p>
      </div>
      <div
        className={twMerge(
          'relative h-full min-h-[600px] w-full',
          '[&>div]:!m-0 [&>div]:!w-full [&>div]:!border-x-0 [&>div]:!border-none [&>div]:!p-0 sm:[&>div]:!rounded sm:[&>div]:!border-x',
          '[&_iframe]:rounded-xl'
        )}
      >
        {children}
      </div>
      <p
        className={twMerge(
          'mt-4 text-center text-sm text-gray-4',
          embedMode && 'text-xs'
        )}
      >
        On-Ramps are not directly endorsed by Arbitrum. Please use at your own
        risk.
      </p>
    </div>
  )
}

const MoonPayProvider = dynamic(
  () => import('@moonpay/moonpay-react').then(mod => mod.MoonPayProvider),
  {
    ssr: false,
    loading: () => <MoonPaySkeleton />
  }
)

const isMoonPayEnabled = isOnrampServiceEnabled('moonpay')

function OnRampProviders({ children }: PropsWithChildren) {
  if (!isOnrampEnabled()) {
    return children
  }

  if (!isMoonPayEnabled) {
    return children
  }

  const moonPayApiKey = process.env.NEXT_PUBLIC_MOONPAY_PK

  if (typeof moonPayApiKey === 'undefined') {
    throw new Error('NEXT_PUBLIC_MOONPAY_PK variable missing.')
  }

  return <MoonPayProvider apiKey={moonPayApiKey}>{children}</MoonPayProvider>
}

const moonPayChainIds = [ChainId.Ethereum, ChainId.ArbitrumOne]

type BuyPanelStore = {
  selectedChainId: ChainId
  setSelectedChainId: (chainId: ChainId) => void
}

export const useBuyPanelStore = create<BuyPanelStore>()(set => ({
  selectedChainId: ChainId.ArbitrumOne,
  setSelectedChainId: (chainId: ChainId) =>
    set(() => ({ selectedChainId: chainId }))
}))

export const BuyPanelNetworkSelectionContainer = React.memo(
  (props: DialogProps & { isOpen: boolean }) => {
    const { embedMode } = useMode()
    const { selectedChainId, setSelectedChainId } = useBuyPanelStore(
      state => ({
        selectedChainId: state.selectedChainId,
        setSelectedChainId: state.setSelectedChainId
      }),
      shallow
    )

    return (
      <Dialog
        isOpen={props.isOpen}
        onClose={() => {
          props.onClose(false)
        }}
        title={`Select Network`}
        actionButtonProps={{ hidden: true }}
        isFooterHidden={true}
        className={twMerge(
          'h-screen overflow-hidden md:h-[calc(100vh_-_175px)] md:max-h-[900px] md:max-w-[500px]',
          embedMode && 'md:h-full'
        )}
      >
        <SearchPanel>
          <SearchPanel.MainPage className="flex h-full max-w-[500px] flex-col py-4">
            <NetworksPanel
              chainIds={moonPayChainIds}
              selectedChainId={selectedChainId}
              close={() => props.onClose(false)}
              onNetworkRowClick={(chain: Chain) => {
                setSelectedChainId(chain.id)
                props.onClose(false)
              }}
              showSearch={false}
              showFooter={false}
            />
          </SearchPanel.MainPage>
        </SearchPanel>
      </Dialog>
    )
  }
)

BuyPanelNetworkSelectionContainer.displayName =
  'BuyPanelNetworkSelectionContainer'

function BuyPanelNetworkButton({
  onClick
}: {
  onClick: React.MouseEventHandler<HTMLButtonElement>
}) {
  const selectedChainId = useBuyPanelStore(state => state.selectedChainId)

  return (
    <Button variant="secondary" onClick={onClick} className="border-white/30">
      <div className="flex flex-nowrap items-center gap-1 text-lg leading-[1.1]">
        <NetworkImage
          chainId={selectedChainId}
          className="h-[20px] w-[20px] p-[2px]"
          size={20}
        />
        {getNetworkName(selectedChainId)}
        <ChevronDownIcon width={12} />
      </div>
    </Button>
  )
}

const BalanceWrapper = memo(function BalanceWrapper() {
  const { address, isConnected } = useAccount()
  const { ethToUSD } = useETHPrice()
  const selectedChainId = useBuyPanelStore(state => state.selectedChainId)
  const provider = getProviderForChainId(selectedChainId)
  const nativeCurrency = useNativeCurrency({ provider })
  const {
    data: balanceState,
    isLoading: isLoadingBalance,
    error: balanceError
  } = useBalance({ chainId: selectedChainId, address })
  const showPriceInUsd = nativeCurrency.symbol.toLowerCase() === 'eth'
  const [dialogProps, openDialog] = useDialog2()
  const openBuyPanelNetworkSelectionDialog = () => {
    openDialog('buy_panel_network_selection')
  }

  if (!isConnected) {
    return null
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
                symbol: balanceState.symbol
              })}
            </span>
          </>
        )}
        {isLoadingBalance && <Loader size="small" />}
        {!isLoadingBalance &&
          (balanceError || typeof balanceState === 'undefined') && (
            <span className="text-error">Failed to load balance.</span>
          )}
        {balanceState && showPriceInUsd && (
          <span className="text-white/70">
            (
            {formatUSD(
              ethToUSD(
                Number(utils.formatEther(BigNumber.from(balanceState.value)))
              )
            )}
            )
          </span>
        )}
      </p>

      <DialogWrapper {...dialogProps} />
    </div>
  )
})

const MoonPayPanel = memo(function MoonPayPanel() {
  const { address } = useAccount()
  const showMoonPay = isOnrampServiceEnabled('moonpay')

  const handleGetSignature = useCallback(
    async (widgetUrl: string): Promise<string> => {
      const response = await fetch(`${getAPIBaseUrl()}/api/moonpay`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ url: widgetUrl })
      })
      const { signature } = await response.json()
      return signature
    },
    []
  )

  if (!showMoonPay) {
    return null
  }

  const MoonPayBuyWidget = dynamic(
    () => import('@moonpay/moonpay-react').then(mod => mod.MoonPayBuyWidget),
    {
      ssr: false
    }
  )

  return (
    <MoonPaySkeleton>
      <MoonPayBuyWidget
        variant="embedded"
        walletAddress={address}
        baseCurrencyCode="usd"
        defaultCurrencyCode="eth"
        onUrlSignatureRequested={handleGetSignature}
        visible
      />
    </MoonPaySkeleton>
  )
})

export function BuyPanel() {
  const { embedMode } = useMode()

  return (
    <div
      className={twMerge(
        'overflow-hidden rounded-lg pb-8 text-white',
        embedMode && 'mx-auto max-w-[540px]'
      )}
    >
      <OnRampProviders>
        <MoonPayPanel />
      </OnRampProviders>
    </div>
  )
}
