import { PropsWithChildren } from 'react'
import Background from '@/app/components/Background'
import { Toast } from '@/bridge/components/common/atoms/Toast'
import { AppSidebar } from '@/bridge/components/Sidebar/AppSidebar'
import { SiteBanner } from '@/bridge/components/common/SiteBanner'
import { BellAlertIcon } from '@heroicons/react/24/outline'

export default function WithSidebarLayout({ children }: PropsWithChildren) {
  return (
    <Background>
      <div className="flex h-screen w-full overflow-hidden">
        <AppSidebar />
        <main className="flex h-full flex-1 flex-col overflow-y-auto">
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
                <span className="italic underline">
                  portal.arbitrum.io/bridge
                </span>
              </p>
            </div>
          </SiteBanner>

          {children}
        </main>
      </div>
      <Toast />
    </Background>
  )
}
