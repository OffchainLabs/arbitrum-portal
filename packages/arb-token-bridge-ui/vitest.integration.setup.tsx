import axios from 'axios';
import { mockAnimationsApi } from 'jsdom-testing-mocks';
import React from 'react';
import { vi } from 'vitest';

import { ChainId } from './src/types/ChainId';
import { rpcURLs } from './src/util/networks';

vi.mock('@arbitrum/sdk/dist/lib/abi/factories/Inbox__factory', async () => {
  const { BigNumber } = await import('ethers');

  return {
    Inbox__factory: {
      connect: vi.fn(() => ({
        calculateRetryableSubmissionFee: vi.fn().mockResolvedValue(BigNumber.from(0)),
      })),
    },
  };
});

vi.mock('next/navigation', async (importActual) => ({
  ...(await importActual()),
  usePathname: vi.fn().mockReturnValue('/bridge'),
}));

vi.mock('react-virtualized', () => ({
  AutoSizer: ({
    children,
  }: {
    children: (props: { width: number; height: number }) => React.ReactElement;
  }) => children({ width: 500, height: 700 }),
  List: React.forwardRef(function MockList(
    {
      rowCount,
      rowRenderer,
    }: {
      rowCount: number;
      rowRenderer: (props: {
        index: number;
        key: number;
        style: React.CSSProperties;
      }) => React.ReactElement | null;
    },
    _ref: React.ForwardedRef<unknown>,
  ) {
    void _ref;
    return (
      <div>
        {Array.from({ length: rowCount }).map((_, index) => (
          <div key={index}>{rowRenderer({ index, key: index, style: {} })}</div>
        ))}
      </div>
    );
  }),
}));

mockAnimationsApi();

const localhostPattern = /(?:^|\/\/)(?:localhost|127\.0\.0\.1)(?::\d+)?(?:\/|$)/i;
const publicEthereumRpcUrl = 'https://ethereum-rpc.publicnode.com';
const publicArbitrumRpcUrl = 'https://arb1.arbitrum.io/rpc';

function ensurePublicRpcEnv(key: string, publicRpcUrl: string) {
  const currentValue = process.env[key];
  if (!currentValue || localhostPattern.test(currentValue)) {
    process.env[key] = publicRpcUrl;
  }
}

// Integration tests should not depend on a local node process.
ensurePublicRpcEnv('NEXT_PUBLIC_RPC_URL_ETHEREUM', publicEthereumRpcUrl);
ensurePublicRpcEnv('NEXT_PUBLIC_RPC_URL_ARBITRUM_ONE', publicArbitrumRpcUrl);
ensurePublicRpcEnv('NEXT_PUBLIC_RPC_URL_BASE', 'https://mainnet.base.org');

// Keep integration tests off local nitro testnode RPCs even if local chain ids are resolved internally.
rpcURLs[ChainId.Local] = publicEthereumRpcUrl;
rpcURLs[ChainId.ArbitrumLocal] = publicArbitrumRpcUrl;
rpcURLs[ChainId.L3Local] = publicArbitrumRpcUrl;

axios.defaults.baseURL = 'http://localhost:3000';
// Avoid happy-dom's XMLHttpRequest adapter to prevent async task manager abort rejections.
(axios.defaults as { adapter?: string }).adapter = 'http';
