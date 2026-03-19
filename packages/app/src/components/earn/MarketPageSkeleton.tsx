function MobileOpportunityCardSkeleton() {
  return (
    <div className="bg-neutral-50 rounded p-4 flex flex-col gap-5">
      <div className="flex items-center gap-2.5">
        <div className="w-3 h-3 rounded-full bg-neutral-200 shrink-0" />
        <div className="h-4 bg-neutral-200 rounded w-1/2" />
      </div>

      <div className="flex items-center justify-between gap-2.5">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-neutral-200 shrink-0" />
          <div className="flex flex-col gap-1">
            <div className="h-5 bg-neutral-200 rounded w-16" />
            <div className="h-3 bg-neutral-200 rounded w-12" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-5 bg-neutral-200 rounded w-12" />
          <div className="h-5 bg-neutral-200 rounded w-10" />
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <div className="flex gap-1">
          <div className="flex-1 bg-neutral-100 rounded p-3 h-[78px] flex flex-col gap-2">
            <div className="h-3 bg-neutral-200 rounded w-10" />
            <div className="h-5 bg-neutral-200 rounded w-16" />
          </div>
          <div className="flex-1 bg-neutral-100 rounded p-3 h-[78px] flex flex-col gap-2">
            <div className="h-3 bg-neutral-200 rounded w-14" />
            <div className="h-5 bg-neutral-200 rounded w-20" />
          </div>
        </div>

        <div className="flex gap-1">
          <div className="flex-1 bg-neutral-100 rounded p-3 flex flex-col gap-2">
            <div className="h-3 bg-neutral-200 rounded w-20" />
            <div className="h-5 bg-neutral-200 rounded w-14" />
          </div>
          <div className="flex-1 bg-neutral-100 rounded p-3 flex flex-col gap-2">
            <div className="h-3 bg-neutral-200 rounded w-16" />
            <div className="h-5 bg-neutral-200 rounded w-14" />
          </div>
        </div>
      </div>
    </div>
  );
}

function DesktopOpportunityRowSkeleton() {
  return (
    <div className="bg-neutral-50 rounded h-[66px] px-4 py-3 flex gap-4 items-center">
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
  );
}

export function MarketPageSkeleton() {
  return (
    <div className="flex flex-col gap-8 animate-pulse">
      <div className="hidden lg:grid grid-cols-3 gap-4">
        {[...Array(3)].map((_, index) => (
          <div key={index} className="bg-neutral-100 rounded p-4 flex items-center gap-4">
            <div className="shrink-0 w-10 h-10 rounded-full bg-neutral-200" />
            <div className="flex-1 min-w-0 space-y-2">
              <div className="h-4 bg-neutral-200 rounded w-3/4" />
              <div className="h-3 bg-neutral-200 rounded w-1/2" />
              <div className="h-5 bg-neutral-200 rounded w-1/3 mt-2" />
            </div>
            <div className="shrink-0 bg-white/10 rounded p-2 w-8 h-8" />
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="h-6 bg-neutral-200 rounded w-32" />
          <div className="h-8 bg-neutral-200 rounded w-24" />
        </div>

        <div className="md:hidden flex flex-col gap-1">
          {[...Array(3)].map((_, index) => (
            <MobileOpportunityCardSkeleton key={index} />
          ))}
        </div>

        <div className="hidden md:flex overflow-x-auto">
          <div className="flex flex-col gap-1 min-w-[900px] w-full">
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

            {[...Array(3)].map((_, index) => (
              <DesktopOpportunityRowSkeleton key={index} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
