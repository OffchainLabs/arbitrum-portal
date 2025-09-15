import { PropsWithChildren } from 'react'

export default function EmbedLayout(props: PropsWithChildren) {
  return <div className="bg-widget-background">{props.children}</div>
}
