import { type RouteExtended, executeRoute, getActiveRoute, resumeRoute } from '@lifi/sdk';
import { mock } from '@wagmi/connectors';
import { createConfig, getAccount, http } from '@wagmi/core';
import { mainnet } from 'viem/chains';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createMockLifiRoute } from '../test-utils/lifi';
import { executeLifiRoute, resumeLifiRoute } from './LifiRouteExecutor';

vi.mock('@lifi/sdk', async (original) => ({
  ...(await original<typeof import('@lifi/sdk')>()),
  executeRoute: vi.fn(),
  resumeRoute: vi.fn(),
  getActiveRoute: vi.fn(),
}));
vi.mock('@wagmi/core', async (original) => ({
  ...(await original<typeof import('@wagmi/core')>()),
  getAccount: vi.fn(),
}));
vi.mock('../util/LifiTransactionStatus', () => ({
  getSubmittedLifiRouteTxHash: (route: RouteExtended) =>
    route.toAmount === '1' ? 'submitted-id' : undefined,
}));

const account = '0x0000000000000000000000000000000000000001';
const otherAccount = '0x0000000000000000000000000000000000000002';
const config = createConfig({
  chains: [mainnet],
  connectors: [mock({ accounts: [account] })],
  transports: { [mainnet.id]: http() },
});
const route = createMockLifiRoute({ fromAddress: account });
const submitted = { ...route, toAmount: '1' };
function callbacks() {
  return {
    wagmiConfig: config,
    onApprovalRequest: vi.fn(async () => true),
    onRouteUpdate: vi.fn(),
    onRouteExecutionError: vi.fn(),
    onRouteExecutionComplete: vi.fn(),
  };
}
function setAccount(address: typeof account | typeof otherAccount) {
  const connector = config.connectors[0];
  if (!connector) throw new Error('Missing test connector');
  vi.mocked(getAccount).mockReturnValue({
    address,
    addresses: [address],
    chainId: 1,
    chain: mainnet,
    connector,
    isConnected: true,
    isConnecting: false,
    isDisconnected: false,
    isReconnecting: false,
    status: 'connected',
  });
}
beforeEach(() => {
  vi.clearAllMocks();
  setAccount(account);
  vi.mocked(getActiveRoute).mockReturnValue(undefined);
});

describe.sequential('LiFi execution lifecycle', () => {
  it('reports submission before completion and retains callbacks after the caller leaves', async () => {
    let finish: (route: RouteExtended) => void = () => {};
    const completion = new Promise<RouteExtended>((resolve) => {
      finish = resolve;
    });
    vi.mocked(executeRoute).mockImplementationOnce((_route, options) => {
      options?.updateRouteHook?.(submitted);
      return completion;
    });
    const effects = callbacks();
    await expect(executeLifiRoute(route, effects)).resolves.toMatchObject({
      txHash: 'submitted-id',
    });
    expect(effects.onRouteExecutionComplete).not.toHaveBeenCalled();
    finish(submitted);
    await vi.waitFor(() =>
      expect(effects.onRouteExecutionComplete).toHaveBeenCalledWith(submitted),
    );
  });
  it('reports a later failure without attempting another submission', async () => {
    const error = new Error('receipt timeout');
    vi.mocked(executeRoute).mockImplementationOnce(async (_route, options) => {
      options?.updateRouteHook?.(submitted);
      throw error;
    });
    const effects = callbacks();
    await expect(executeLifiRoute(route, effects)).resolves.toMatchObject({
      txHash: 'submitted-id',
    });
    await vi.waitFor(() => expect(effects.onRouteExecutionError).toHaveBeenCalledWith(error));
    expect(executeRoute).toHaveBeenCalledTimes(1);
  });
  it('rejects before submission when the user declines approval', async () => {
    const effects = callbacks();
    effects.onApprovalRequest.mockResolvedValue(false);
    vi.mocked(executeRoute).mockImplementationOnce(async (_route, options) => {
      await options?.updateTransactionRequestHook?.({ requestType: 'approve' });
      return submitted;
    });
    await expect(executeLifiRoute(route, effects)).rejects.toThrow('User declined token approval');
    expect(effects.onRouteExecutionError).not.toHaveBeenCalled();
  });
  it('rechecks the account after approval confirmation', async () => {
    const effects = callbacks();
    effects.onApprovalRequest.mockImplementation(async () => {
      setAccount(otherAccount);
      return true;
    });
    vi.mocked(executeRoute).mockImplementationOnce(async (_route, options) => {
      await options?.updateTransactionRequestHook?.({ requestType: 'approve' });
      return submitted;
    });
    await expect(executeLifiRoute(route, effects)).rejects.toThrow('signing account changed');
  });
  it('rejects active and previously submitted routes instead of resubmitting', async () => {
    vi.mocked(getActiveRoute).mockReturnValueOnce(route);
    await expect(executeLifiRoute(route, callbacks())).rejects.toThrow('already started');
    await expect(executeLifiRoute(submitted, callbacks())).rejects.toThrow('already started');
    expect(executeRoute).not.toHaveBeenCalled();
  });
  it('resumes the captured route with the same account guard', async () => {
    vi.mocked(resumeRoute).mockImplementationOnce(async (_route, options) => {
      await options?.updateTransactionRequestHook?.({ requestType: 'transaction' });
      options?.updateRouteHook?.(submitted);
      return submitted;
    });
    const effects = callbacks();
    await expect(resumeLifiRoute(submitted, effects)).resolves.toMatchObject({
      txHash: 'submitted-id',
    });
    expect(resumeRoute).toHaveBeenCalledWith(submitted, expect.any(Object));
    expect(executeRoute).not.toHaveBeenCalled();
  });
  it('refuses resumed signing with a different account', async () => {
    setAccount(otherAccount);
    vi.mocked(resumeRoute).mockImplementationOnce(async (_route, options) => {
      await options?.updateTransactionRequestHook?.({ requestType: 'transaction' });
      return submitted;
    });
    await expect(resumeLifiRoute(submitted, callbacks())).rejects.toThrow(
      'signing account changed',
    );
  });
});
