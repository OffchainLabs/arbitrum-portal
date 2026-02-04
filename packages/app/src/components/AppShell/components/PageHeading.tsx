import { PropsWithChildren } from 'react';

export function PageHeading({ children }: PropsWithChildren) {
  return <h1 className="hidden md:block text-[32px] font-bold text-white px-0">{children}</h1>;
}
