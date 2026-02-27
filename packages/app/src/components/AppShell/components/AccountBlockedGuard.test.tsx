// @vitest-environment happy-dom
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { AccountBlockedGuard } from './AccountBlockedGuard';

const blockedAddress = '0x01e2919679362dfbc9ee1644ba9c6da6d6245bb1';

const useAccountMock = vi.fn();
const useAccountIsBlockedMock = vi.fn();

vi.mock('next/navigation', () => ({
  usePathname: () => '/bridge',
}));

vi.mock('wagmi', () => ({
  useAccount: () => useAccountMock(),
}));

vi.mock('@/bridge/hooks/useAccountIsBlocked', () => ({
  useAccountIsBlocked: () => useAccountIsBlockedMock(),
}));

describe('AccountBlockedGuard', () => {
  it('returns nothing when wallet is disconnected', () => {
    useAccountMock.mockReturnValue({ address: undefined });
    useAccountIsBlockedMock.mockReturnValue({ isBlocked: true });

    const { container } = render(<AccountBlockedGuard />);

    expect(container.firstChild).toBe(null);
  });

  it('returns nothing when wallet is not blocked', () => {
    useAccountMock.mockReturnValue({ address: '0xabc' });
    useAccountIsBlockedMock.mockReturnValue({ isBlocked: false });

    const { container } = render(<AccountBlockedGuard />);

    expect(container.firstChild).toBe(null);
  });

  it('renders blocked dialog when wallet is blocked', () => {
    useAccountMock.mockReturnValue({ address: blockedAddress });
    useAccountIsBlockedMock.mockReturnValue({ isBlocked: true });

    render(<AccountBlockedGuard>hidden app content</AccountBlockedGuard>);

    expect(screen.getByText('This wallet address is blocked')).not.toBeNull();
    expect(screen.getByText(blockedAddress)).not.toBeNull();
    expect(screen.queryByText('hidden app content')).toBeNull();
  });
});
