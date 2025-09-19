import BridgeClient from '../../../(with-sidebar)/bridge/BridgeClient'
import { Toast } from '@/bridge/components/common/atoms/Toast'

import '../../../../styles/bridge.css'

export default async function EmbededPage() {
  return (
    <>
      <BridgeClient />
      <Toast />
    </>
  )
}
