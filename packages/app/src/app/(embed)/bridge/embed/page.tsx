import BridgeClient from '../../../(with-sidebar)/bridge/BridgeClient'
import { Toast } from '@/bridge/components/common/atoms/Toast'

import '../../../../styles/bridge.css'
import { addOrbitChainsToArbitrumSDK } from 'packages/app/src/initialization'
import { sanitizeAndRedirect } from 'packages/app/src/utils/sanitizeAndRedirect'

export default async function EmbededPage({
  searchParams
}: {
  searchParams: {
    [key: string]: string | string[] | undefined
  }
}) {
  if (searchParams.sanitized !== 'true') {
    addOrbitChainsToArbitrumSDK()
    await sanitizeAndRedirect(searchParams, '/bridge/embed')
  }

  return (
    <>
      <BridgeClient />
      <Toast />
    </>
  )
}
