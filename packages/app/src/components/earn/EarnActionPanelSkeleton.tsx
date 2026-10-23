import { Card } from '@/components/Card';

export function EarnActionPanelSkeleton() {
  return (
    <Card className="flex animate-pulse flex-col gap-4 rounded bg-gray-1 p-4">
      {/* Action Tabs Skeleton */}
      <div className="flex gap-0.5 rounded bg-white/5 p-0.5">
        <div className="h-[42px] flex-1 rounded bg-gray-700/50 p-4 py-3" />
        <div className="h-[42px] flex-1 rounded bg-gray-700/50 p-4 py-3" />
      </div>

      {/* Amount Input Section Skeleton */}
      <div className="flex flex-col gap-2 rounded bg-neutral-100 p-4">
        <div className="flex items-center justify-between">
          <div className="h-3 w-32 rounded bg-gray-700" />
          <div className="h-4 w-10 rounded-md bg-gray-700" />
        </div>
        <div className="flex items-center justify-between">
          <div className="h-[34px] w-3/4 rounded bg-gray-700" />
          <div className="flex items-center gap-2 rounded bg-neutral-200 px-2.5 py-[5px]">
            <div className="h-5 w-5 rounded-full bg-gray-700" />
            <div className="h-4 w-12 rounded bg-gray-700" />
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div className="h-3 w-24 rounded bg-gray-700" />
          <div className="h-3 w-20 rounded bg-gray-700" />
        </div>
      </div>

      {/* Transaction Details Skeleton */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="h-3 w-24 rounded bg-gray-700" />
          <div className="h-3 w-16 rounded bg-gray-700" />
        </div>
        <div className="flex items-center justify-between">
          <div className="h-3 w-32 rounded bg-gray-700" />
          <div className="h-3 w-20 rounded bg-gray-700" />
        </div>
      </div>

      {/* Submit Button Skeleton */}
      <div className="h-12 w-full rounded bg-gray-700" />
    </Card>
  );
}
