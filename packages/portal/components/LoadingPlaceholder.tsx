import { Card } from './Card';

export const LoadingPlaceholder = () => (
  <div className="flex w-full animate-pulse flex-col gap-12">
    {/* filters */}
    <Card className="w-[200px] animate-pulse" />

    {/* cover photo */}
    <Card className="h-[350px] w-full animate-pulse" />

    {/* section title */}
    <Card className="w-[200px] animate-pulse" />

    {/* project cards */}
    <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
      {[...Array(10)].map((_, index) => (
        <Card key={index} className="h-[150px] w-full animate-pulse" />
      ))}
    </div>
  </div>
);
