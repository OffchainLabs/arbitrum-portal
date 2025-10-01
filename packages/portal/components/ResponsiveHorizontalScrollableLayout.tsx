import { PropsWithChildren } from 'react';

export const ResponsiveHorizontalScrollableLayout = ({ children }: PropsWithChildren) => {
  return (
    <div className="relative w-full">
      <div className="pointer-events-none absolute z-10 h-full w-full bg-gradient-to-r from-transparent from-80% to-black/90 lg:hidden" />
      <div className="w-full overflow-y-hidden overflow-x-scroll pb-2 lg:pb-0">
        <div className="flex w-max flex-nowrap gap-3 lg:w-full">{children}</div>
      </div>
    </div>
  );
};
