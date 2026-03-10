export function YourHoldingsPageSkeleton() {
  return (
    <div className="flex flex-col gap-6 animate-pulse">
      <div className="flex flex-col gap-4">
        <div className="flex gap-4">
          <div className="flex-1 bg-neutral-50 rounded px-4 py-6 flex flex-col gap-6">
            <div className="flex flex-col gap-3">
              <div className="h-4 bg-neutral-200 rounded w-24" />
              <div className="h-8 bg-neutral-200 rounded w-32" />
            </div>
            <div className="flex flex-col gap-3">
              <div className="relative h-3 bg-neutral-200 rounded-[5px] overflow-hidden">
                <div className="absolute h-3 bg-neutral-100 rounded-[5px] left-0 top-1/2 -translate-y-1/2 w-1/3" />
              </div>
              <div className="flex gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-[5px] bg-neutral-200" />
                  <div className="h-3 bg-neutral-200 rounded w-16" />
                </div>
              </div>
            </div>
          </div>

          <div className="flex-1 bg-neutral-50 rounded px-4 py-6 flex flex-col gap-3">
            <div className="h-4 bg-neutral-200 rounded w-28" />
            <div className="flex flex-col gap-3">
              <div className="h-8 bg-neutral-200 rounded w-32" />
              <div className="h-4 bg-neutral-200 rounded w-20" />
            </div>
          </div>

          <div className="flex-1 bg-neutral-50 rounded px-4 py-6 flex flex-col justify-between">
            <div className="flex flex-col gap-3">
              <div className="h-4 bg-neutral-200 rounded w-20" />
              <div className="h-8 bg-neutral-200 rounded w-24" />
            </div>
            <div className="h-3 bg-neutral-200 rounded w-40" />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <div className="flex gap-4 items-center pt-4 px-4 pb-0">
          <div className="w-[150px] shrink-0 h-3 bg-neutral-200 rounded" />
          <div className="w-[146px] shrink-0 h-3 bg-neutral-200 rounded" />
          <div className="flex-1 h-3 bg-neutral-200 rounded" />
          <div className="flex-1 h-3 bg-neutral-200 rounded" />
          <div className="flex-1 h-3 bg-neutral-200 rounded" />
          <div className="w-[116px] shrink-0 h-3 bg-neutral-200 rounded" />
          <div className="flex-1 h-3 bg-neutral-200 rounded" />
          <div className="w-[42px] shrink-0" />
        </div>

        <div className="flex flex-col gap-1">
          {[...Array(5)].map((_, rowIndex) => (
            <div
              key={rowIndex}
              className="bg-neutral-50 rounded h-[66px] px-4 py-3 flex gap-4 items-center"
            >
              <div className="w-[150px] shrink-0 flex items-center gap-2.5">
                <div className="w-2.5 h-2.5 rounded bg-neutral-200" />
                <div className="flex flex-col gap-0.5">
                  <div className="h-4 bg-neutral-200 rounded w-24" />
                  <div className="h-3 bg-neutral-200 rounded w-16" />
                </div>
              </div>
              <div className="w-[146px] shrink-0 flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-neutral-200 shrink-0" />
                <div className="flex flex-col gap-0.5">
                  <div className="h-4 bg-neutral-200 rounded w-12" />
                  <div className="h-3 bg-neutral-200 rounded w-16" />
                </div>
              </div>
              <div className="flex-1 flex items-center gap-2 min-w-0">
                <div className="h-4 bg-neutral-200 rounded w-12" />
                <div className="w-5 h-5 rounded-full bg-neutral-200" />
              </div>
              <div className="flex-1 flex flex-col gap-0.5 min-w-0">
                <div className="h-4 bg-neutral-200 rounded w-16" />
                <div className="h-3 bg-neutral-200 rounded w-12" />
              </div>
              <div className="flex-1 flex flex-col gap-0.5 min-w-0">
                <div className="h-4 bg-neutral-200 rounded w-16" />
                <div className="h-3 bg-neutral-200 rounded w-12" />
              </div>
              <div className="w-[116px] shrink-0">
                <div className="h-4 bg-neutral-200 rounded w-16" />
              </div>
              <div className="flex-1 flex items-center gap-2 min-w-0">
                <div className="w-6 h-6 rounded-full bg-neutral-200 shrink-0" />
                <div className="h-4 bg-neutral-200 rounded w-20" />
              </div>
              <div className="bg-white/10 rounded p-2 w-8 h-8" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
