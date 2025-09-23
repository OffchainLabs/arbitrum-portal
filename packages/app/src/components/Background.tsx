import { PropsWithChildren } from 'react'
import Image from 'next/image'
import EclipseBottom from '@/images/eclipse_bottom.png'

export default function Background(props: PropsWithChildren) {
  return (
    <>
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
        <div className="relative flex flex-row">{props.children}</div>
      </div>
    </>
  )
}
