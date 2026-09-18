// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ChainId } from '@/bridge/types/ChainId';
import { getChainMetadata } from '@/bridge/util/networkMetadata';
import { useAccountMenu } from '@/bridge/wallet/hooks/useAccountMenu';

import { NavWallet } from './NavWallet';

const fixture = vi.hoisted(() => ({ pathname: '/bridge' }));
vi.mock('next/navigation', () => ({ usePathname: () => fixture.pathname }));
vi.mock('@/bridge/wallet/hooks/useAccountMenu', () => ({ useAccountMenu: vi.fn() }));
vi.mock('@/bridge/wallet/hooks/useWallets', () => ({
  useWalletForChain: () => ({ account: { chainId: 1 } }),
}));
vi.mock('@/bridge/components/common/CustomBoringAvatar', () => ({
  CustomBoringAvatar: () => <span>Wallet avatar</span>,
}));
vi.mock('@/bridge/components/common/SafeImage', () => ({
  SafeImage: () => <span>Wallet image</span>,
}));

const menu = {
  address: '0x1234567890123456789012345678901234567890',
  accountShort: '0x1234...7890',
  ensName: undefined,
  ensAvatar: undefined,
  udInfo: { name: null },
  isConnected: true,
  disconnect: vi.fn(async () => {}),
  openConnectModal: vi.fn(async () => {}),
  chain: getChainMetadata(ChainId.ArbitrumOne),
  setQueryParams: vi.fn(),
};

afterEach(cleanup);
describe.sequential('header wallet menu', () => {
  beforeEach(() => {
    fixture.pathname = '/bridge';
    vi.clearAllMocks();
    vi.mocked(useAccountMenu).mockReturnValue(menu);
  });

  it('looks up the selected source wallet once for both button and dropdown', () => {
    render(<NavWallet />);
    expect(useAccountMenu).toHaveBeenCalledTimes(1);
    expect(useAccountMenu).toHaveBeenCalledWith(undefined);
    expect(screen.getByRole('button').textContent).toContain(menu.accountShort);
  });

  it('preserves the selected source explorer and shared disconnect action', () => {
    const open = vi.spyOn(window, 'open').mockImplementation(() => null);
    render(<NavWallet />);
    fireEvent.click(screen.getByRole('button'));
    fireEvent.click(screen.getByRole('button', { name: 'Explorer' }));
    expect(open).toHaveBeenCalledWith(
      'https://arbiscan.io/address/' + menu.address,
      '_blank',
      'noopener,noreferrer',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Disconnect Wallet' }));
    expect(menu.disconnect).toHaveBeenCalledTimes(1);
    expect(useAccountMenu).toHaveBeenCalledTimes(1);
    open.mockRestore();
  });

  it('keeps the connected EVM explorer outside the bridge', () => {
    fixture.pathname = '/earn';
    const open = vi.spyOn(window, 'open').mockImplementation(() => null);
    render(<NavWallet />);
    fireEvent.click(screen.getByRole('button'));
    fireEvent.click(screen.getByRole('button', { name: 'Explorer' }));
    expect(open).toHaveBeenCalledWith(
      'https://etherscan.io/address/' + menu.address,
      '_blank',
      'noopener,noreferrer',
    );
    expect(useAccountMenu).toHaveBeenCalledTimes(1);
    expect(useAccountMenu).toHaveBeenCalledWith(ChainId.Ethereum);
    open.mockRestore();
  });
});
