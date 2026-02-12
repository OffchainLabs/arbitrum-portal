import { PropsWithChildren } from 'react';

export function PageHeading({ children }: PropsWithChildren) {
  return (
    <h1 className="hidden md:block text-3xl font-bold text-white px-0 m-0 leading-8">{children}</h1>
  );
}
