import dynamic from 'next/dynamic'
import React, { memo, PropsWithChildren, useCallback } from 'react'
import { twMerge } from 'tailwind-merge'
import { useAccount } from 'wagmi'

import { getAPIBaseUrl } from '../../util'
import { isOnrampServiceEnabled } from '../../util/featureFlag'

import { useMode } from '@/bridge/hooks/useMode'
import { SafeImage } from '../common/SafeImage'

export function MoonPaySkeleton({ children }: PropsWithChildren) {
  const { embedMode } = useMode()

  return (
    <div
      className={twMerge(
        'bg-gray-8 relative flex h-full w-full flex-col items-center justify-center overflow-hidden p-4 pt-5 text-white md:rounded-lg',
        embedMode && 'bg-widget-background'
      )}
    >
      <div className="absolute left-0 top-0 h-[120px] w-full bg-[url('/images/gray_square_background.svg')]"></div>
      <div
        className={twMerge(
          'bg-eclipse absolute left-1/2 top-[55px] h-[282px] w-[602px] shrink-0 -translate-x-1/2',
          embedMode && 'bg-eclipseWidget'
        )}
      ></div>
      <div className="relative mb-4 flex flex-col items-center justify-center">
        <SafeImage
          src="/images/onramp/moonpay.svg"
          alt="MoonPay"
          width={embedMode ? 45 : 65}
          height={embedMode ? 45 : 65}
          fallback={
            <div className="bg-gray-dark/70 h-8 w-8 min-w-8 rounded-full" />
          }
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
          'text-gray-4 mt-4 text-center text-sm',
          embedMode && 'text-xs'
        )}
      >
        On-Ramps are not directly endorsed by Arbitrum. Please use at your own
        risk.
      </p>
    </div>
  )
}

export const MoonPayPanel = memo(function MoonPayPanel() {
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
