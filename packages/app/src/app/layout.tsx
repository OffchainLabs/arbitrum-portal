import type { Metadata } from 'next'
import { PropsWithChildren } from 'react'
import { twMerge } from 'tailwind-merge'
import { unica } from '@/bridge/components/common/Font'
import { BodyClassSyncer } from '../components/BodyClassSyncer'
import '../styles/common.css'
import { PORTAL_DATA_ENDPOINT } from '@/common/constants'

export const metadata: Metadata = {
  metadataBase: new URL(PORTAL_DATA_ENDPOINT),
  icons: {
    icon: '/logo.png'
  }
}

export default function RootLayout({ children, a }: PropsWithChildren) {
  return (
    <html lang="en">
      <body className={twMerge('relative bg-black text-white', unica.variable)}>
        {children}
        <BodyClassSyncer />
      </body>
    </html>
  )
}
