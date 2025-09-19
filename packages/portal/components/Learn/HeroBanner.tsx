import { Card } from '@/components/Card';

export const HeroBanner = () => (
  <Card
    className="relative flex h-[180px] flex-col justify-end bg-cover bg-center bg-no-repeat lg:flex-row lg:items-center lg:justify-start lg:p-[50px]"
    style={{
      backgroundImage: `url('/images/hero-learn.webp')`,
    }}
  >
    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent lg:hidden" />

    <div className="z-20 flex shrink-0 flex-col gap-2 lg:max-w-sm lg:gap-6">
      <h1 className="text-4xl">Learn</h1>
    </div>
  </Card>
);
