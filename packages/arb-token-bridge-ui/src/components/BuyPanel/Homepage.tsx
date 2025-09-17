import { PropsWithChildren } from 'react'
import Image from 'next/image'

function OnrampServiceTile({
  name,
  logo,
  link
}: {
  name: string
  logo: string
  link: string
}) {
  return (
    <div>
      <Image src={logo} alt={name} width={50} height={50} />
      <p className="mt-2 text-3xl">MoonPay</p>
    </div>
  )
}

export function Homepage({ children }: PropsWithChildren) {
  return <div></div>
}
