// @vitest-environment happy-dom
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { AccountBlockedGuard } from './AccountBlockedGuard';

const blockedAddress = '0x01e2919679362dfbc9ee1644ba9c6da6d6245bb1';

const useAccountIsBlockedMock = vi.fn();

vi.mock('next/navigation', () => ({
  usePathname: () => '/bridge',
}));

vi.mock('@/bridge/hooks/useAccountIsBlocked', () => ({
  useAccountIsBlocked: () => useAccountIsBlockedMock(),
}));

describe('AccountBlockedGuard', () => {
  it('renders children when no wallet is blocked', () => {
    useAccountIsBlockedMock.mockReturnValue({ isBlocked: false, blockedAddress: undefined });

    render(<AccountBlockedGuard>app content</AccountBlockedGuard>);

    expect(screen.getByText('app content')).not.toBeNull();
  });

  it('renders blocked dialog when wallet is blocked', () => {
    useAccountIsBlockedMock.mockReturnValue({ isBlocked: true, blockedAddress });

    render(<AccountBlockedGuard>hidden app content</AccountBlockedGuard>);

    expect(screen.getByText('This wallet address is blocked')).not.toBeNull();
    expect(screen.getByText(blockedAddress)).not.toBeNull();
    expect(screen.queryByText('hidden app content')).toBeNull();
  });

  it('shows a Solana address with its case', () => {
    const solanaAddress = 'So11111111111111111111111111111111111111112';
    useAccountIsBlockedMock.mockReturnValue({ isBlocked: true, blockedAddress: solanaAddress });

    render(<AccountBlockedGuard />);

    expect(screen.getByText(solanaAddress)).not.toBeNull();
  });
});
