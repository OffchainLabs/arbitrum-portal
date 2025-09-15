import BridgeClient from '@/app/app/(with-sidebar)/bridge/BridgeClient'
import { Toast } from '@/bridge/components/common/atoms/Toast'

export default async function EmbededPage() {
  return (
    <>
      <BridgeClient />
      <Toast />
    </>
  )
}
