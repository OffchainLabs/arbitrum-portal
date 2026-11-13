function DesktopHistoryRowSkeleton() {
  return (
    <div className="flex h-[66px] items-center gap-4 rounded-lg bg-gray-1 px-4 py-3">
      <div className="flex w-[140px] shrink-0 flex-col gap-1">
        <div className="h-4 w-16 rounded bg-neutral-200" />
        <div className="h-3 w-20 rounded bg-neutral-200" />
      </div>
      <div className="w-[80px] shrink-0">
        <div className="h-4 w-14 rounded bg-neutral-200" />
      </div>
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <div className="h-6 w-6 shrink-0 rounded-full bg-neutral-200" />
        <div className="flex min-w-0 flex-col gap-1">
          <div className="h-4 w-24 rounded bg-neutral-200" />
          <div className="h-3 w-20 rounded bg-neutral-200" />
        </div>
      </div>
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <div className="h-4 w-24 rounded bg-neutral-200" />
        <div className="h-4 w-4 shrink-0 rounded bg-neutral-200" />
      </div>
      <div className="h-8 w-8 shrink-0 rounded bg-white/10 p-2" />
    </div>
  );
}

function MobileHistoryRowSkeleton() {
  return (
    <div className="flex h-[78px] flex-col justify-center gap-2 rounded-lg bg-gray-1 px-4 py-4">
      <div className="flex w-full items-center justify-between">
        <div className="h-4 w-24 rounded bg-neutral-200" />
        <div className="h-4 w-20 rounded bg-neutral-200" />
      </div>
      <div className="flex w-full items-center justify-between">
        <div className="h-3 w-16 rounded bg-neutral-200" />
        <div className="h-4 w-20 rounded bg-neutral-200" />
      </div>
    </div>
  );
}

export function TransactionHistoryPlaceholder() {
  return (
    <div className="flex animate-pulse flex-col">
      <div className="hidden items-center gap-4 px-4 pt-2 pb-2 md:flex">
        <div className="h-3 w-[140px] shrink-0 rounded bg-neutral-200" />
        <div className="h-3 w-[80px] shrink-0 rounded bg-neutral-200" />
        <div className="h-3 flex-1 rounded bg-neutral-200" />
        <div className="h-3 flex-1 rounded bg-neutral-200" />
        <div className="w-[42px] shrink-0" />
      </div>

      <div className="hidden flex-col gap-1 md:flex">
        {Array.from({ length: 5 }).map((_, rowIndex) => (
          <DesktopHistoryRowSkeleton key={rowIndex} />
        ))}
      </div>

      <div className="flex flex-col gap-2.5 md:hidden">
        {Array.from({ length: 2 }).map((_, groupIndex) => (
          <div key={groupIndex} className="flex flex-col gap-1">
            <div className="flex items-center pt-4 pb-[5px]">
              <div className="h-3 w-28 rounded bg-neutral-200" />
            </div>
            {Array.from({ length: 2 }).map((_, rowIndex) => (
              <MobileHistoryRowSkeleton key={`${groupIndex}-${rowIndex}`} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
