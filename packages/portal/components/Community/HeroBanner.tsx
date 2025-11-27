import { Card } from '@/components/Card';

export const HeroBanner = () => (
  <Card
    className="relative flex h-[200px] flex-col justify-end p-6 lg:flex-row lg:items-center lg:justify-start lg:p-[50px]"
    style={{
      background:
        'linear-gradient(90deg, rgba(29,63,112,1) 0%, rgba(188,171,214,1) 26%, rgba(112,189,212,1) 40%, rgba(70,143,211,1) 60%, rgba(126,91,212,1) 84%, rgba(211,86,131,1) 100%)',
    }}
  >
    <div className="z-20 flex shrink-0 flex-col gap-2 lg:max-w-sm lg:gap-6">
      <h1 className="text-4xl">Community</h1>
      <div className="text-base">
        Engage with our resources to get involved with the Arbitrum community
      </div>
    </div>
  </Card>
);
