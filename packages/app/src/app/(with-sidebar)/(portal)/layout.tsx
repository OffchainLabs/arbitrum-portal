import { PropsWithChildren } from 'react'
import { MobileHeader } from '../../../../../portal/components/MobileHeader'
import { OrbitChainPanel } from '../../../../../portal/components/OrbitChainPanel/OrbitChainPanel'
import { ProjectPanel } from '../../../../../portal/components/ProjectPanel'
import { PortalPage } from '../../../../../portal/components/PortalPage/PortalPage'
import { Providers } from '../../../../../portal/components/Providers'

import '../../../styles/portal.css'

export default function PortalLayout({ children }: PropsWithChildren) {
  return (
    <Providers>
      <MobileHeader />
      <PortalPage>{children}</PortalPage>
      <OrbitChainPanel />
      <ProjectPanel />
    </Providers>
  )
}
