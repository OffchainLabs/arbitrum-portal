import type { Metadata } from 'next'
import { PropsWithChildren } from 'react'
import { twMerge } from 'tailwind-merge'
import { unica } from '@/bridge/components/common/Font'

export const metadata: Metadata = {
  icons: {
    icon: '/logo.png'
  }
}

export default function RootLayout({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <body
        className={twMerge(
          'relative flex-col bg-black text-white',
          unica.variable
        )}
      >
        {children}
      </body>
    </html>
  )
}
