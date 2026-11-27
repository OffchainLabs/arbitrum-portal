import axios from 'axios';
import { mockAnimationsApi } from 'jsdom-testing-mocks';
import React from 'react';
import { afterEach, vi } from 'vitest';

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

const pendingTokenListFetches = vi.hoisted(() => new Set<Promise<void>>());

// TokenListSyncer and TokenSearch do not await addBridgeTokenListToBridge. Wait for its fetches
// after each test: a fetch that settles after the test file's DOM environment is gone calls
// setState without `window`, and vitest fails the run on that unhandled rejection.
vi.mock('./src/util/TokenListUtils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./src/util/TokenListUtils')>();

  return {
    ...actual,
    addBridgeTokenListToBridge: (...args: Parameters<typeof actual.addBridgeTokenListToBridge>) => {
      const promise = actual.addBridgeTokenListToBridge(...args);
      const forget = () => pendingTokenListFetches.delete(promise);
      pendingTokenListFetches.add(promise);
      promise.then(forget, forget);
      return promise;
    },
  };
});

async function waitForTokenListFetches(): Promise<void> {
  if (pendingTokenListFetches.size === 0) {
    return;
  }
  await Promise.allSettled(pendingTokenListFetches);
  // A settled fetch can trigger more fetches.
  return waitForTokenListFetches();
}

afterEach(waitForTokenListFetches, 120_000);

// Avoid error when reown is making request to walletConnect endpoint
vi.mock('./src/wallet/hooks/useWalletModal', () => ({
  useWalletModal: () => ({
    openConnectModal: vi.fn(),
  }),
}));

// Avoid error from appkit hooks requiring createAppKit to be called first
vi.mock('@reown/appkit/react', () => ({
  createAppKit: vi.fn(),
  useAppKit: () => ({ open: vi.fn() }),
  useWalletInfo: () => ({ walletInfo: undefined }),
}));

class MockLoadedImage {
  onload: ((event: Event) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;

  set src(_value: string) {
    queueMicrotask(() => {
      this.onload?.(new Event('load'));
    });
  }
}

// SafeImage waits for browser image loading before rendering an <img>; make this deterministic in tests.
vi.stubGlobal('Image', MockLoadedImage);

mockAnimationsApi();

axios.defaults.baseURL = process.env.INTEGRATION_TEST_BASE_URL ?? 'http://localhost:3000';
// Avoid happy-dom's XMLHttpRequest adapter to prevent async task manager abort rejections.
(axios.defaults as { adapter?: string }).adapter = 'http';
