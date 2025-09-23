'use client'
import { usePostHog } from 'posthog-js/react'
import { Sidebar } from '@offchainlabs/cobalt'
import { usePathname } from 'next/navigation'

export const AppSidebar = () => {
  const posthog = usePostHog()
  const pathname = usePathname()

  return (
    <div className="sticky left-0 top-0 z-20 hidden h-full font-normal sm:flex">
      <Sidebar
        logger={posthog}
        activeMenu={
          pathname === '/'
            ? 'Home'
            : pathname === '/bridge'
            ? 'Bridge'
            : undefined
        }
      />
    </div>
  )
}
