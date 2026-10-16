import { PathnameContext } from 'next/dist/shared/lib/hooks-client-context.shared-runtime';
import { type PropsWithChildren, useMemo, useState } from 'react';
import {
  type PartialLocation,
  type QueryParamAdapter,
  type QueryParamAdapterComponent,
  QueryParamProvider,
} from 'use-query-params';

import { queryParamProviderOptions } from '../hooks/useArbQueryParams';
import { WalletContext } from '../wallet/WalletContext';
import type { WalletContextValue } from '../wallet/types';

export function createWalletTestWrapper({
  wallets,
  query,
}: {
  wallets?: WalletContextValue;
  query: Record<string, string | number>;
}) {
  const search = `?${new URLSearchParams(Object.entries(query).map(([key, value]) => [key, String(value)]))}`;
  const Adapter: QueryParamAdapterComponent = ({ children }) => {
    const [location, setLocation] = useState<PartialLocation>({ search });
    const adapter = useMemo<QueryParamAdapter>(
      () => ({
        location,
        push: setLocation,
        replace: setLocation,
      }),
      [location],
    );
    return children(adapter);
  };
  return function Wrapper({ children }: PropsWithChildren) {
    return (
      <PathnameContext.Provider value="/">
        <QueryParamProvider adapter={Adapter} options={queryParamProviderOptions}>
          {wallets ? (
            <WalletContext.Provider value={wallets}>{children}</WalletContext.Provider>
          ) : (
            children
          )}
        </QueryParamProvider>
      </PathnameContext.Provider>
    );
  };
}
