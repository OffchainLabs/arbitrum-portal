import { useAccount } from 'wagmi'
import dynamic from 'next/dynamic'
import { useCallback } from 'react'

import { getAPIBaseUrl } from '../util'

const MoonPayProvider = dynamic(
  () => import('@moonpay/moonpay-react').then(mod => mod.MoonPayProvider),
  { ssr: false }
)

const MoonPayBuyWidget = dynamic(
  () => import('@moonpay/moonpay-react').then(mod => mod.MoonPayBuyWidget),
  { ssr: false }
)

export function BuyPanel() {
  const { address } = useAccount()

  const moonPayApiKey = process.env.NEXT_PUBLIC_MOONPAY_PK

  if (typeof moonPayApiKey === 'undefined') {
    throw new Error('NEXT_PUBLIC_MOONPAY_PK variable missing.')
  }

  async function onLogin() {
    console.log('Customer logged in to MoonPay!')
  }

  const handleGetSignature = useCallback(
    async (url: string): Promise<string> => {
      const response = await fetch(
        `${getAPIBaseUrl()}/api/moonpay?url=${url}`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        }
      )
      const { signature } = await response.json()
      console.log('Signature:', signature)
      return signature
    },
    []
  )

  return (
    <MoonPayProvider apiKey={moonPayApiKey}>
      <MoonPayBuyWidget
        variant="embedded"
        walletAddress={address}
        onLogin={onLogin}
        baseCurrencyCode="usd"
        defaultCurrencyCode="eth"
        onUrlSignatureRequested={handleGetSignature}
        visible
      />
    </MoonPayProvider>
  )
}
