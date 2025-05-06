import { useAccount } from 'wagmi'
import { memo, useCallback } from 'react'
import { MoonPayBuyWidget } from '@moonpay/moonpay-react'
import { twMerge } from 'tailwind-merge'

import { getAPIBaseUrl } from '../util'

const BuyPanel = memo(function BuyPanel() {
  const { address } = useAccount()

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
      console.log('Signature:', signature)
      return signature
    },
    []
  )

  return (
    <div
      className={twMerge(
        'flex h-full w-full flex-col items-center justify-center',
        '[&>div]:!m-0 [&>div]:!w-full [&>div]:!rounded-none [&>div]:!border-x-0 [&>div]:!border-white/30 [&>div]:!p-4 sm:[&>div]:!rounded sm:[&>div]:!border-x'
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
  )
})

export default BuyPanel
