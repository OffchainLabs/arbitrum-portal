export function OpportunityDetailPageSkeleton() {
  return (
    <div className="flex flex-col gap-4 animate-pulse pb-20 lg:pb-0">
      <div className="flex items-center gap-2">
        <div className="w-5 h-5 bg-neutral-200 rounded" />
        <div className="h-5 bg-neutral-200 rounded w-12" />
      </div>

      <div className="flex items-center gap-2">
        <div className="h-6 bg-neutral-200 rounded w-48" />
        <div className="h-6 bg-neutral-200 rounded w-20" />
      </div>

      <div className="lg:hidden space-y-4">
        <div className="bg-neutral-100 rounded flex flex-col p-4">
          <div className="flex flex-col gap-2">
            <div className="h-3 bg-neutral-200 rounded w-24" />
            <div className="h-10 bg-neutral-200 rounded w-36" />
            <div className="h-3 bg-neutral-200 rounded w-20" />
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div className="h-3 bg-neutral-200 rounded w-20" />
          <div className="h-3 bg-neutral-200 rounded w-16" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 flex flex-col gap-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, index) => (
              <div key={index} className="rounded flex flex-col gap-3 bg-neutral-50 p-4">
                <div className="h-3 bg-neutral-200 rounded w-16" />
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-neutral-200" />
                  <div className="h-4 bg-neutral-200 rounded w-20" />
                </div>
              </div>
            ))}
          </div>

          <div className="rounded bg-neutral-50 p-4 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="h-6 bg-neutral-200 rounded w-32" />
              <div className="flex gap-2">
                <div className="h-8 bg-neutral-200 rounded w-16" />
                <div className="h-8 bg-neutral-200 rounded w-16" />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <div className="h-10 bg-neutral-200 rounded w-32" />
              <div className="h-5 bg-neutral-200 rounded w-20" />
            </div>
            <div className="h-[300px] bg-neutral-100 rounded" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[...Array(3)].map((_, index) => (
              <div key={index} className="rounded bg-neutral-50 p-4 flex flex-col gap-2">
                <div className="h-3 bg-neutral-200 rounded w-32" />
                <div className="h-5 bg-neutral-200 rounded w-16" />
              </div>
            ))}
          </div>

          <div className="rounded bg-neutral-50 p-4 flex flex-col gap-3">
            <div className="h-5 bg-neutral-200 rounded w-48" />
            <div className="flex flex-col gap-2">
              <div className="h-4 bg-neutral-200 rounded w-full" />
              <div className="h-4 bg-neutral-200 rounded w-full" />
              <div className="h-4 bg-neutral-200 rounded w-3/4" />
            </div>
          </div>

          <div className="rounded bg-neutral-50 p-4 flex flex-col gap-4">
            <div className="h-5 bg-neutral-200 rounded w-40" />
            <div className="flex flex-col gap-2">
              {[...Array(3)].map((_, index) => (
                <div key={index} className="h-12 bg-neutral-100 rounded" />
              ))}
            </div>
          </div>
        </div>

        <div className="hidden lg:flex flex-col gap-4">
          <div className="bg-neutral-50 rounded flex flex-col gap-4 p-4">
            <div className="h-5 bg-neutral-200 rounded w-32" />

            <div className="bg-neutral-100 rounded flex flex-col p-4 gap-3">
              <div className="h-3 bg-neutral-200 rounded w-24" />
              <div className="h-8 bg-neutral-200 rounded w-40" />
              <div className="h-3 bg-neutral-200 rounded w-24" />
            </div>

            <div className="flex justify-between items-center">
              <div className="h-3 bg-neutral-200 rounded w-20" />
              <div className="h-3 bg-neutral-200 rounded w-16" />
            </div>

            <div className="flex gap-2">
              <div className="h-10 bg-neutral-200 rounded flex-1" />
              <div className="h-10 bg-neutral-200 rounded flex-1" />
            </div>

            <div className="flex flex-col gap-2">
              <div className="h-3 bg-neutral-200 rounded w-24" />
              <div className="h-12 bg-neutral-100 rounded" />
              <div className="flex justify-between items-center">
                <div className="h-3 bg-neutral-200 rounded w-32" />
                <div className="h-6 bg-neutral-200 rounded w-12" />
              </div>
            </div>

            <div className="flex flex-col gap-2 border-t border-white/10 pt-4">
              <div className="flex justify-between">
                <div className="h-3 bg-neutral-200 rounded w-20" />
                <div className="h-3 bg-neutral-200 rounded w-16" />
              </div>
              <div className="flex justify-between">
                <div className="h-3 bg-neutral-200 rounded w-28" />
                <div className="h-3 bg-neutral-200 rounded w-12" />
              </div>
            </div>

            <div className="h-12 bg-neutral-200 rounded" />
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-gray-1 border-t border-white/10 p-4 lg:hidden z-40">
        <div className="flex gap-2">
          <div className="h-12 bg-neutral-200 rounded flex-1" />
          <div className="h-12 bg-neutral-200 rounded flex-1 opacity-60" />
        </div>
      </div>
    </div>
  );
}
