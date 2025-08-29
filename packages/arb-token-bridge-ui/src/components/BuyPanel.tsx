import Image from 'next/image'
import { useAccount } from 'wagmi'
import React, { memo, useCallback } from 'react'
import { MoonPayBuyWidget } from '@moonpay/moonpay-react'
import { twMerge } from 'tailwind-merge'
import { create } from 'zustand'
import { shallow } from 'zustand/shallow'

import MoonPay from '@/images/onramp/moonpay.svg'

import { getAPIBaseUrl } from '../util'
import { useNativeCurrency } from '../hooks/useNativeCurrency'
import { getProviderForChainId } from '@/token-bridge-sdk/utils'
import { ChainId } from '../types/ChainId'
import { SafeImage } from './common/SafeImage'
import { useNativeCurrencyBalanceForChainId } from '../hooks/useNativeCurrencyBalanceForChainId'
import { formatAmount } from '../util/NumberUtils'
import { NetworksPanel } from './common/NetworkSelectionContainer'
import { Button } from './common/Button'
import { NetworkImage } from './common/NetworkImage'
import { getNetworkName } from '../util/networks'
import { ChevronDownIcon } from '@heroicons/react/24/outline'
import { Dialog } from './common/Dialog'
import { useMode } from '../hooks/useMode'
import { SearchPanel } from './common/SearchPanel/SearchPanel'
import { Chain } from 'viem'
import { DialogProps, DialogWrapper, useDialog2 } from './common/Dialog2'

const moonPayChainIds = [ChainId.Sepolia, ChainId.Ethereum, ChainId.ArbitrumOne]

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

function BuyPanelNetworkButton({ onClick }: { onClick: () => void }) {
  const { selectedChainId } = useBuyPanelStore(
    state => ({
      selectedChainId: state.selectedChainId,
      setSelectedChainId: state.setSelectedChainId
    }),
    shallow
  )

  return (
    <Button variant="secondary" onClick={onClick}>
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

const BuyPanel = memo(function BuyPanel() {
  const { address } = useAccount()
  const { selectedChainId } = useBuyPanelStore()
  const provider = getProviderForChainId(selectedChainId)
  const nativeCurrency = useNativeCurrency({ provider })
  const {
    data: balanceState,
    isLoading: isLoadingBalance,
    error: balanceError
  } = useNativeCurrencyBalanceForChainId(selectedChainId, address)
  const [dialogProps, openDialog] = useDialog2()
  const openBuyPanelNetworkSelectionDialog = () => {
    openDialog('buy_panel_network_selection')
  }

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

  return (
    <div className="pb-8 text-white">
      <div className="my-6 flex flex-col items-center justify-center gap-3 text-center">
        <BuyPanelNetworkButton onClick={openBuyPanelNetworkSelectionDialog} />
        <p className="flex items-center justify-center space-x-1 text-lg">
          <span>Balance:</span>
          <SafeImage
            width={20}
            height={20}
            src={nativeCurrency.logoUrl}
            alt={nativeCurrency.symbol}
            className="!ml-2 block"
          />
          {balanceState && (
            <span>
              {formatAmount(balanceState.balance, {
                decimals: balanceState.decimals,
                symbol: balanceState.symbol
              })}
            </span>
          )}
        </p>
      </div>
      <div
        className={twMerge(
          'relative flex h-full w-full flex-col items-center justify-center overflow-hidden bg-gray-8 p-4 pt-5 text-white md:rounded-lg'
        )}
      >
        <div className="absolute left-0 top-0 h-[120px] w-full bg-[url('/images/gray_square_background.svg')]"></div>
        <div className="absolute left-1/2 top-[55px] h-[282px] w-[602px] shrink-0 -translate-x-1/2 bg-eclipse"></div>
        <div className="relative mb-4 flex flex-col items-center justify-center">
          <Image src={MoonPay} alt="MoonPay" width={65} height={65} />
          <p className="mt-2 text-3xl">MoonPay</p>
          <p className="mt-1 text-xl">PayPal, Debit Card, Apple Pay</p>
        </div>
        <div
          className={twMerge(
            'relative h-full w-full',
            '[&>div]:!m-0 [&>div]:!w-full [&>div]:!border-x-0 [&>div]:!border-none [&>div]:!p-0 sm:[&>div]:!rounded sm:[&>div]:!border-x',
            '[&_iframe]:rounded-lg'
          )}
        >
          <MoonPayBuyWidget
            variant="embedded"
            walletAddress={address}
            baseCurrencyCode="usd"
            defaultCurrencyCode="eth"
            onUrlSignatureRequested={handleGetSignature}
            visible
          />
        </div>
      </div>
      <DialogWrapper {...dialogProps} />
    </div>
  )
})

export default BuyPanel
