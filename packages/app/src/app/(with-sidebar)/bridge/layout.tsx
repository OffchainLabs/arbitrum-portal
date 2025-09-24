import { PropsWithChildren } from 'react'

import '../../../styles/bridge.css'
import 'tippy.js/dist/tippy.css'
import 'tippy.js/themes/light.css'
import '@rainbow-me/rainbowkit/styles.css'
import 'react-toastify/dist/ReactToastify.css'

/** CSS imported in layout are imported only once
 * They would be imported multiple times if imported in page.tsx
 */
export default function BridgeLayout({ children }: PropsWithChildren) {
  return <>{children}</>
}
