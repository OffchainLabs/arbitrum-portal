import { Card } from '@/components/Card';

export const LoadingPlaceholderCarousel = () => (
  <div className="flex w-full flex-nowrap gap-4 overflow-hidden">
    {[...Array(4)].map((_, index) => (
      <Card key={index} className="h-[300px] shrink-0 sm:w-full lg:w-[80%]" />
    ))}
  </div>
);
