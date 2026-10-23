export function OpportunityDetailPageSkeleton() {
  return (
    <div className="flex animate-pulse flex-col gap-4 pb-20 lg:pb-0">
      <div className="flex items-center gap-2">
        <div className="h-5 w-5 rounded bg-neutral-200" />
        <div className="h-5 w-12 rounded bg-neutral-200" />
      </div>

      <div className="flex items-center gap-2">
        <div className="h-6 w-48 rounded bg-neutral-200" />
        <div className="h-6 w-20 rounded bg-neutral-200" />
      </div>

      <div className="space-y-4 lg:hidden">
        <div className="flex flex-col rounded bg-neutral-100 p-4">
          <div className="flex flex-col gap-2">
            <div className="h-3 w-24 rounded bg-neutral-200" />
            <div className="h-10 w-36 rounded bg-neutral-200" />
            <div className="h-3 w-20 rounded bg-neutral-200" />
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div className="h-3 w-20 rounded bg-neutral-200" />
          <div className="h-3 w-16 rounded bg-neutral-200" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-2">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[...Array(4)].map((_, index) => (
              <div key={index} className="flex flex-col gap-3 rounded bg-neutral-50 p-4">
                <div className="h-3 w-16 rounded bg-neutral-200" />
                <div className="flex items-center gap-2">
                  <div className="h-5 w-5 rounded-full bg-neutral-200" />
                  <div className="h-4 w-20 rounded bg-neutral-200" />
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-4 rounded bg-neutral-50 p-4">
            <div className="flex items-center justify-between">
              <div className="h-6 w-32 rounded bg-neutral-200" />
              <div className="flex gap-2">
                <div className="h-8 w-16 rounded bg-neutral-200" />
                <div className="h-8 w-16 rounded bg-neutral-200" />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <div className="h-10 w-32 rounded bg-neutral-200" />
              <div className="h-5 w-20 rounded bg-neutral-200" />
            </div>
            <div className="h-[300px] rounded bg-neutral-100" />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {[...Array(3)].map((_, index) => (
              <div key={index} className="flex flex-col gap-2 rounded bg-neutral-50 p-4">
                <div className="h-3 w-32 rounded bg-neutral-200" />
                <div className="h-5 w-16 rounded bg-neutral-200" />
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-3 rounded bg-neutral-50 p-4">
            <div className="h-5 w-48 rounded bg-neutral-200" />
            <div className="flex flex-col gap-2">
              <div className="h-4 w-full rounded bg-neutral-200" />
              <div className="h-4 w-full rounded bg-neutral-200" />
              <div className="h-4 w-3/4 rounded bg-neutral-200" />
            </div>
          </div>

          <div className="flex flex-col gap-4 rounded bg-neutral-50 p-4">
            <div className="h-5 w-40 rounded bg-neutral-200" />
            <div className="flex flex-col gap-2">
              {[...Array(3)].map((_, index) => (
                <div key={index} className="h-12 rounded bg-neutral-100" />
              ))}
            </div>
          </div>
        </div>

        <div className="hidden flex-col gap-4 lg:flex">
          <div className="flex flex-col gap-4 rounded bg-neutral-50 p-4">
            <div className="h-5 w-32 rounded bg-neutral-200" />

            <div className="flex flex-col gap-3 rounded bg-neutral-100 p-4">
              <div className="h-3 w-24 rounded bg-neutral-200" />
              <div className="h-8 w-40 rounded bg-neutral-200" />
              <div className="h-3 w-24 rounded bg-neutral-200" />
            </div>

            <div className="flex items-center justify-between">
              <div className="h-3 w-20 rounded bg-neutral-200" />
              <div className="h-3 w-16 rounded bg-neutral-200" />
            </div>

            <div className="flex gap-2">
              <div className="h-10 flex-1 rounded bg-neutral-200" />
              <div className="h-10 flex-1 rounded bg-neutral-200" />
            </div>

            <div className="flex flex-col gap-2">
              <div className="h-3 w-24 rounded bg-neutral-200" />
              <div className="h-12 rounded bg-neutral-100" />
              <div className="flex items-center justify-between">
                <div className="h-3 w-32 rounded bg-neutral-200" />
                <div className="h-6 w-12 rounded bg-neutral-200" />
              </div>
            </div>

            <div className="flex flex-col gap-2 border-t border-white/10 pt-4">
              <div className="flex justify-between">
                <div className="h-3 w-20 rounded bg-neutral-200" />
                <div className="h-3 w-16 rounded bg-neutral-200" />
              </div>
              <div className="flex justify-between">
                <div className="h-3 w-28 rounded bg-neutral-200" />
                <div className="h-3 w-12 rounded bg-neutral-200" />
              </div>
            </div>

            <div className="h-12 rounded bg-neutral-200" />
          </div>
        </div>
      </div>

      <div className="fixed right-0 bottom-0 left-0 z-60 border-t border-white/10 bg-gray-1 p-4 lg:hidden">
        <div className="flex gap-2">
          <div className="h-12 flex-1 rounded bg-neutral-200" />
          <div className="h-12 flex-1 rounded bg-neutral-200 opacity-60" />
        </div>
      </div>
    </div>
  );
}
