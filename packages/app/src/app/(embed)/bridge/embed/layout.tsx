import { PropsWithChildren } from 'react'

import '../../../../styles/bridge.css'
import 'tippy.js/dist/tippy.css'
import 'tippy.js/themes/light.css'
import '@rainbow-me/rainbowkit/styles.css'
import 'react-toastify/dist/ReactToastify.css'

export default function EmbedLayout(props: PropsWithChildren) {
  return (
    <div className="bg-widget-background bridge-wrapper">{props.children}</div>
  )
}
