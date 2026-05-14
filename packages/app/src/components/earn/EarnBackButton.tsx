import { ChevronLeftIcon } from '@heroicons/react/24/outline';

export const earnBackButtonClassName =
  'inline-flex items-center gap-4 text-[18px] font-semibold leading-none text-white/50 transition-opacity hover:opacity-80';

export function EarnBackButtonLabel() {
  return (
    <>
      <span className="flex h-[31px] w-[31px] shrink-0 items-center justify-center rounded-md bg-white/[0.08]">
        <ChevronLeftIcon className="h-[15px] w-[15px] text-white" />
      </span>
      Back
    </>
  );
}
