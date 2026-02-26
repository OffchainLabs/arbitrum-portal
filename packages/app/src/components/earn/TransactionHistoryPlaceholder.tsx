function DesktopHistoryRowSkeleton() {
  return (
    <div className="bg-gray-1 rounded-lg h-[66px] px-4 py-3 flex gap-4 items-center">
      <div className="w-[140px] shrink-0 flex flex-col gap-1">
        <div className="h-4 bg-neutral-200 rounded w-16" />
        <div className="h-3 bg-neutral-200 rounded w-20" />
      </div>
      <div className="w-[80px] shrink-0">
        <div className="h-4 bg-neutral-200 rounded w-14" />
      </div>
      <div className="flex-1 flex items-center gap-2 min-w-0">
        <div className="w-6 h-6 rounded-full bg-neutral-200 shrink-0" />
        <div className="flex flex-col gap-1 min-w-0">
          <div className="h-4 bg-neutral-200 rounded w-24" />
          <div className="h-3 bg-neutral-200 rounded w-20" />
        </div>
      </div>
      <div className="flex-1 flex items-center gap-2 min-w-0">
        <div className="h-4 bg-neutral-200 rounded w-24" />
        <div className="w-4 h-4 rounded bg-neutral-200 shrink-0" />
      </div>
      <div className="bg-white/10 rounded p-2 w-8 h-8 shrink-0" />
    </div>
  );
}

function MobileHistoryRowSkeleton() {
  return (
    <div className="bg-gray-1 rounded-lg h-[78px] px-4 py-4 flex flex-col justify-center gap-2">
      <div className="flex items-center justify-between w-full">
        <div className="h-4 bg-neutral-200 rounded w-24" />
        <div className="h-4 bg-neutral-200 rounded w-20" />
      </div>
      <div className="flex items-center justify-between w-full">
        <div className="h-3 bg-neutral-200 rounded w-16" />
        <div className="h-4 bg-neutral-200 rounded w-20" />
      </div>
    </div>
  );
}

export function TransactionHistoryPlaceholder() {
  return (
    <div className="flex flex-col animate-pulse">
      <div className="hidden md:flex gap-4 items-center pt-2 px-4 pb-2">
        <div className="w-[140px] shrink-0 h-3 bg-neutral-200 rounded" />
        <div className="w-[80px] shrink-0 h-3 bg-neutral-200 rounded" />
        <div className="flex-1 h-3 bg-neutral-200 rounded" />
        <div className="flex-1 h-3 bg-neutral-200 rounded" />
        <div className="w-[42px] shrink-0" />
      </div>

      <div className="hidden md:flex flex-col gap-1">
        {[...Array(5)].map((_, rowIndex) => (
          <DesktopHistoryRowSkeleton key={rowIndex} />
        ))}
      </div>

      <div className="flex md:hidden flex-col gap-2.5">
        {[...Array(2)].map((_, groupIndex) => (
          <div key={groupIndex} className="flex flex-col gap-1">
            <div className="flex items-center pt-4 pb-[5px]">
              <div className="h-3 bg-neutral-200 rounded w-28" />
            </div>
            {[...Array(2)].map((_, rowIndex) => (
              <MobileHistoryRowSkeleton key={`${groupIndex}-${rowIndex}`} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
