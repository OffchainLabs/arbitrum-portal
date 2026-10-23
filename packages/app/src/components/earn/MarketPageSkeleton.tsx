function MobileOpportunityCardSkeleton() {
  return (
    <div className="flex flex-col gap-5 rounded bg-neutral-50 p-4">
      <div className="flex items-center gap-2.5">
        <div className="h-3 w-3 shrink-0 rounded-full bg-neutral-200" />
        <div className="h-4 w-1/2 rounded bg-neutral-200" />
      </div>

      <div className="flex items-center justify-between gap-2.5">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 shrink-0 rounded-full bg-neutral-200" />
          <div className="flex flex-col gap-1">
            <div className="h-5 w-16 rounded bg-neutral-200" />
            <div className="h-3 w-12 rounded bg-neutral-200" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-5 w-12 rounded bg-neutral-200" />
          <div className="h-5 w-10 rounded bg-neutral-200" />
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <div className="flex gap-1">
          <div className="flex h-[78px] flex-1 flex-col gap-2 rounded bg-neutral-100 p-3">
            <div className="h-3 w-10 rounded bg-neutral-200" />
            <div className="h-5 w-16 rounded bg-neutral-200" />
          </div>
          <div className="flex h-[78px] flex-1 flex-col gap-2 rounded bg-neutral-100 p-3">
            <div className="h-3 w-14 rounded bg-neutral-200" />
            <div className="h-5 w-20 rounded bg-neutral-200" />
          </div>
        </div>

        <div className="flex gap-1">
          <div className="flex flex-1 flex-col gap-2 rounded bg-neutral-100 p-3">
            <div className="h-3 w-20 rounded bg-neutral-200" />
            <div className="h-5 w-14 rounded bg-neutral-200" />
          </div>
          <div className="flex flex-1 flex-col gap-2 rounded bg-neutral-100 p-3">
            <div className="h-3 w-16 rounded bg-neutral-200" />
            <div className="h-5 w-14 rounded bg-neutral-200" />
          </div>
        </div>
      </div>
    </div>
  );
}

function DesktopOpportunityRowSkeleton() {
  return (
    <div className="flex h-[66px] items-center gap-4 rounded bg-neutral-50 px-4 py-3">
      <div className="flex w-[150px] shrink-0 items-center gap-2.5">
        <div className="h-2.5 w-2.5 rounded bg-neutral-200" />
        <div className="flex flex-col gap-0.5">
          <div className="h-4 w-24 rounded bg-neutral-200" />
          <div className="h-3 w-16 rounded bg-neutral-200" />
        </div>
      </div>
      <div className="flex w-[146px] shrink-0 items-center gap-2">
        <div className="h-6 w-6 shrink-0 rounded-full bg-neutral-200" />
        <div className="flex flex-col gap-0.5">
          <div className="h-4 w-12 rounded bg-neutral-200" />
          <div className="h-3 w-16 rounded bg-neutral-200" />
        </div>
      </div>
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <div className="h-4 w-12 rounded bg-neutral-200" />
        <div className="h-5 w-5 rounded-full bg-neutral-200" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="h-4 w-16 rounded bg-neutral-200" />
        <div className="h-3 w-12 rounded bg-neutral-200" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="h-4 w-16 rounded bg-neutral-200" />
        <div className="h-3 w-12 rounded bg-neutral-200" />
      </div>
      <div className="w-[116px] shrink-0">
        <div className="h-4 w-16 rounded bg-neutral-200" />
      </div>
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <div className="h-6 w-6 shrink-0 rounded-full bg-neutral-200" />
        <div className="h-4 w-20 rounded bg-neutral-200" />
      </div>
      <div className="h-8 w-8 rounded bg-white/10 p-2" />
    </div>
  );
}

export function MarketPageSkeleton() {
  return (
    <div className="flex animate-pulse flex-col gap-8">
      <div className="hidden grid-cols-3 gap-4 lg:grid">
        {[...Array(3)].map((_, index) => (
          <div key={index} className="flex items-center gap-4 rounded bg-neutral-100 p-4">
            <div className="h-10 w-10 shrink-0 rounded-full bg-neutral-200" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-4 w-3/4 rounded bg-neutral-200" />
              <div className="h-3 w-1/2 rounded bg-neutral-200" />
              <div className="mt-2 h-5 w-1/3 rounded bg-neutral-200" />
            </div>
            <div className="h-8 w-8 shrink-0 rounded bg-white/10 p-2" />
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="h-6 w-32 rounded bg-neutral-200" />
          <div className="h-8 w-24 rounded bg-neutral-200" />
        </div>

        <div className="flex flex-col gap-1 md:hidden">
          {[...Array(3)].map((_, index) => (
            <MobileOpportunityCardSkeleton key={index} />
          ))}
        </div>

        <div className="hidden overflow-x-auto md:flex">
          <div className="flex w-full min-w-[900px] flex-col gap-1">
            <div className="flex items-center gap-4 px-4 pt-4 pb-0">
              <div className="h-3 w-[150px] shrink-0 rounded bg-neutral-200" />
              <div className="h-3 w-[146px] shrink-0 rounded bg-neutral-200" />
              <div className="h-3 flex-1 rounded bg-neutral-200" />
              <div className="h-3 flex-1 rounded bg-neutral-200" />
              <div className="h-3 flex-1 rounded bg-neutral-200" />
              <div className="h-3 w-[116px] shrink-0 rounded bg-neutral-200" />
              <div className="h-3 flex-1 rounded bg-neutral-200" />
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
