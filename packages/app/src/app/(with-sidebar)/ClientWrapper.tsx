'use client'

import { PropsWithChildren } from 'react'
import { Toast } from '@/bridge/components/common/atoms/Toast'
import { SiteBanner } from '@/bridge/components/common/SiteBanner'
import { AppSidebar } from '@/bridge/components/Sidebar/AppSidebar'
import { useSearchParams } from 'next/navigation'
import { ModeParamEnum } from '@/bridge/util/queryParamUtils'
import BridgeClient from './bridge/BridgeClient'
import { BellAlertIcon } from '@heroicons/react/24/outline'

/**
 * useSearchParams is only accessible in a Client Component
 * We use this wrapper, so the parent layout can still be a Server Component
 */
export default function ClientWrapper({ children }: PropsWithChildren) {
  const searchParams = useSearchParams()

  if (searchParams.get('mode') === ModeParamEnum.EMBED) {
    return (
      <div className="bg-widget-background">
        <BridgeClient />
        <Toast />
      </div>
    )
  }

  return (
    <>
      <SiteBanner>
        <div className="text-center">
          <BellAlertIcon className="mr-1 inline-block h-4 w-4 text-white" />
          <p className="inline text-sm">
            <strong>URL Update:</strong> Starting Sept 23rd, The official
            Arbitrum Bridge will redirect from{' '}
            <span className="mr-[3px] inline-block italic underline">
              bridge.arbitrum.io
            </span>{' '}
            to{' '}
            <span className="italic underline">portal.arbitrum.io/bridge</span>
          </p>
        </div>
      </SiteBanner>
      <div className="flex h-screen w-full overflow-hidden">
        <AppSidebar />
        <main className="flex h-full flex-1 flex-col overflow-y-auto">
          {children}
        </main>
      </div>
      <Toast />
    </>
  )
}
