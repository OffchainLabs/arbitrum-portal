import type { Metadata } from 'next'
import Image from 'next/image'
import EclipseBottom from '@/images/eclipse_bottom.png'
import { PropsWithChildren } from 'react'
import { twMerge } from 'tailwind-merge'
import { unica } from '@/bridge/components/common/Font'

import '@/bridge/styles/tailwind.css'

export const metadata: Metadata = {
  title: 'Arbitrum Token Bridge',
  description: 'Bridge tokens between Ethereum and Arbitrum networks',
  icons: {
    icon: '/logo.png'
  }
}

export default function RootLayout({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <body className={twMerge('relative flex-col bg-black', unica.variable)}>
        <Image
          src={EclipseBottom}
          alt="grains"
          className="absolute left-1/2 top-0 w-full -translate-x-1/2 rotate-180 opacity-20"
          aria-hidden
        />
        <Image
          src={EclipseBottom}
          alt="grains"
          className="absolute bottom-0 left-1/2 w-full -translate-x-1/2 opacity-20"
          aria-hidden
        />
        <div className="relative flex flex-col sm:min-h-screen">
          <div className="relative flex flex-row">{children}</div>
        </div>
      </body>
    </html>
  )
}
