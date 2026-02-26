import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { AccountBlockedGuard } from './AccountBlockedGuard';

const blockedAddress = '0x01e2919679362dfbc9ee1644ba9c6da6d6245bb1';

const useAccountMock = vi.fn();
const useAccountIsBlockedMock = vi.fn();

vi.mock('wagmi', () => ({
  useAccount: () => useAccountMock(),
}));

vi.mock('@/bridge/hooks/useAccountIsBlocked', () => ({
  useAccountIsBlocked: () => useAccountIsBlockedMock(),
}));

vi.mock('@/bridge/components/App/BlockedDialog', () => ({
  BlockedDialog: ({ address }: { address: string }) => <div data-address={address}>blocked</div>,
}));

describe('AccountBlockedGuard', () => {
  it('returns nothing when wallet is disconnected', () => {
    useAccountMock.mockReturnValue({ address: undefined });
    useAccountIsBlockedMock.mockReturnValue({ isBlocked: true });

    const html = renderToStaticMarkup(<AccountBlockedGuard />);

    expect(html).toBe('');
  });

  it('returns nothing when wallet is not blocked', () => {
    useAccountMock.mockReturnValue({ address: '0xabc' });
    useAccountIsBlockedMock.mockReturnValue({ isBlocked: false });

    const html = renderToStaticMarkup(<AccountBlockedGuard />);

    expect(html).toBe('');
  });

  it('renders blocked dialog when wallet is blocked', () => {
    useAccountMock.mockReturnValue({ address: blockedAddress });
    useAccountIsBlockedMock.mockReturnValue({ isBlocked: true });

    const html = renderToStaticMarkup(<AccountBlockedGuard />);

    expect(html).toContain('blocked');
    expect(html).toContain(`data-address="${blockedAddress}"`);
  });
});
