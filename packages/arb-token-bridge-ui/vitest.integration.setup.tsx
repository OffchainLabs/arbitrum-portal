import axios from 'axios';
import { mockAnimationsApi } from 'jsdom-testing-mocks';
import React from 'react';
import { vi } from 'vitest';

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
  useRouter: vi.fn().mockReturnValue({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
  }),
  useSearchParams: vi.fn().mockReturnValue(new URLSearchParams()),
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

// Avoid error when reown is making request to walletConnect endpoint
vi.mock('./src/wallet/hooks/useWalletModal', () => ({
  useWalletModal: () => ({
    openConnectModal: vi.fn(),
  }),
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

axios.defaults.baseURL = 'http://localhost:3000';
// Avoid happy-dom's XMLHttpRequest adapter to prevent async task manager abort rejections.
(axios.defaults as { adapter?: string }).adapter = 'http';
