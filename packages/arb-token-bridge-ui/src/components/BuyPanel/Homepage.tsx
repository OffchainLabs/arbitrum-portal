import { PropsWithChildren } from 'react'
import Image from 'next/image'
import { ChainId } from '@/bridge/types/ChainId'

const onrampServices = [
  {
    name: 'MoonPay',
    logo: '/images/onramp-logos/moonpay-logo.png',
    link: 'https://www.moonpay.com/buy',
    chains: [ChainId.Ethereum, ChainId.ArbitrumOne]
  }
] as const

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
