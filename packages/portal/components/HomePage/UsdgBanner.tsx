import Image from 'next/image';

import { Card } from '@/components/Card';

export function UsdgBanner() {
  return (
    <Card
      cardType="link"
      href="https://arbitrum.io/products/usdg-vaults"
      className="relative aspect-[2000/483] overflow-hidden p-0 md:aspect-auto md:h-[282px]"
      analyticsProps={{
        eventName: 'Homepage USDG Banner Click',
      }}
    >
      <Image
        src="/images/usdg_banner.webp"
        alt="Global Dollar Network x Arbitrum"
        fill
        sizes="(max-width: 1200px) 100vw, 1200px"
        className="object-cover"
      />
    </Card>
  );
}
