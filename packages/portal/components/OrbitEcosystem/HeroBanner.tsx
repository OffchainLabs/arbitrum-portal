import { Card } from '@/components/Card';

export const HeroBanner = () => {
  return (
    <Card className="relative flex flex-col justify-end bg-[#1B4ADD] p-6 lg:flex-row lg:items-center lg:justify-start lg:p-12">
      <div className="z-20 flex shrink-0 flex-col gap-2 lg:max-w-sm lg:gap-6">
        <h1 className="text-4xl">A Universe of Chains</h1>
        <div className="text-base">
          Explore the array of Arbitrum chains, built with unparalleled customization on
          Arbitrum&apos;s cutting-edge tech.
        </div>
      </div>

      <div className="absolute top-0 left-0 z-10 h-full w-full bg-linear-to-t from-blue from-65% to-transparent md:from-35% lg:bg-linear-to-r lg:to-90%" />
    </Card>
  );
};
