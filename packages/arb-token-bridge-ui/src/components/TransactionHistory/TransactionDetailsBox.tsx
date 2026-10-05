import { PropsWithChildren } from 'react';

export function TransactionDetailsBox({
  children,
  header,
}: PropsWithChildren<{ header?: string }>) {
  return (
    <div className="flex w-full flex-col rounded border border-white/10 bg-white/5 p-3 font-light text-white">
      {header && <h4 className="mb-2 text-xs uppercase text-white/60">{header}</h4>}
      {children}
    </div>
  );
}
