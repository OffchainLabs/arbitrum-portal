import { Card } from '@/components/Card';

export function EarnActionPanelSkeleton() {
  return (
    <Card className="bg-gray-1 rounded-lg flex flex-col gap-4 p-4 animate-pulse">
      {/* Action Tabs Skeleton */}
      <div className="bg-white/5 rounded-lg flex gap-0.5 p-0.5">
        <div className="flex-1 rounded-lg p-4 py-3 h-[42px] bg-gray-700/50" />
        <div className="flex-1 rounded-lg p-4 py-3 h-[42px] bg-gray-700/50" />
      </div>

      {/* Amount Input Section Skeleton */}
      <div className="bg-neutral-100 rounded-lg flex flex-col p-4 gap-2">
        <div className="flex items-center justify-between">
          <div className="h-3 bg-gray-700 rounded w-32" />
          <div className="h-4 w-10 bg-gray-700 rounded-md" />
        </div>
        <div className="flex items-center justify-between">
          <div className="h-[34px] bg-gray-700 rounded w-3/4" />
          <div className="bg-[#333333] rounded-lg flex gap-2 items-center px-2.5 py-[5px]">
            <div className="w-5 h-5 rounded-full bg-gray-700" />
            <div className="h-4 bg-gray-700 rounded w-12" />
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div className="h-3 bg-gray-700 rounded w-24" />
          <div className="h-3 bg-gray-700 rounded w-20" />
        </div>
      </div>

      {/* Transaction Details Skeleton */}
      <div className="flex flex-col gap-2">
        <div className="flex justify-between items-center">
          <div className="h-3 bg-gray-700 rounded w-24" />
          <div className="h-3 bg-gray-700 rounded w-16" />
        </div>
        <div className="flex justify-between items-center">
          <div className="h-3 bg-gray-700 rounded w-32" />
          <div className="h-3 bg-gray-700 rounded w-20" />
        </div>
      </div>

      {/* Submit Button Skeleton */}
      <div className="w-full h-12 bg-gray-700 rounded-lg" />
    </Card>
  );
}
