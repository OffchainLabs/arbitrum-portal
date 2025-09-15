import { PropsWithChildren } from 'react'
import ClientWrapper from './ClientWrapper'

export default function WithSidebarLayout({ children }: PropsWithChildren) {
  return <ClientWrapper>{children}</ClientWrapper>
}
