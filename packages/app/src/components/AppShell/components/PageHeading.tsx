import { PropsWithChildren } from 'react';

export function PageHeading({ children }: PropsWithChildren) {
  return (
    <h1 className="m-0 hidden px-0 text-3xl leading-8 font-bold text-white md:block">{children}</h1>
  );
}
