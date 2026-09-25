import dayjs from 'dayjs';
import { BigNumber } from 'ethers';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { OutgoingMessageState } from '../../../hooks/arbTokenBridge.types';
import { getOutgoingMessageState } from '../helpers';

const statusMock = vi.hoisted(() => vi.fn());

vi.mock('@arbitrum/sdk', async (importActual) => ({
  ...(await importActual<typeof import('@arbitrum/sdk')>()),
  ChildToParentMessageReader: class {
    status = statusMock;
  },
}));

vi.mock('../../../hooks/useArbTokenBridge', () => ({
  getExecutedMessagesCacheKey: ({ event }: { event: { hash: BigNumber } }) => event.hash.toString(),
}));

vi.mock('../../../hooks/useTransferDuration', () => ({
  getWithdrawalConfirmationDate: ({
    createdAt,
    useBaseConfirmationTime,
  }: {
    createdAt: number;
    useBaseConfirmationTime?: boolean;
  }) => dayjs(createdAt).add(useBaseConfirmationTime ? 100 : 200, 'second'),
}));

const CREATED_AT_SECONDS = 1_000_000;

function getState(messageHash = 1) {
  const event = {
    timestamp: BigNumber.from(CREATED_AT_SECONDS),
    hash: BigNumber.from(messageHash),
  } as any;
  return getOutgoingMessageState(event, {} as any, {} as any, 42161);
}

function setSecondsSinceCreation(seconds: number) {
  vi.setSystemTime((CREATED_AT_SECONDS + seconds) * 1000);
}

describe.sequential('getOutgoingMessageState', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    statusMock.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('skips status checks before the base date and throttles them until the estimated date', async () => {
    setSecondsSinceCreation(50);
    expect(await getState()).toBe(OutgoingMessageState.UNCONFIRMED);
    expect(statusMock).not.toHaveBeenCalled();

    statusMock.mockResolvedValue(OutgoingMessageState.CONFIRMED);

    setSecondsSinceCreation(120);
    expect(await getState()).toBe(OutgoingMessageState.CONFIRMED);
    expect(statusMock).toHaveBeenCalledTimes(1);

    setSecondsSinceCreation(130);
    expect(await getState()).toBe(OutgoingMessageState.CONFIRMED);
    expect(statusMock).toHaveBeenCalledTimes(1);

    setSecondsSinceCreation(210);
    await getState();
    setSecondsSinceCreation(220);
    await getState();
    expect(statusMock).toHaveBeenCalledTimes(3);
  });

  it('throttles status checks after a failed request', async () => {
    statusMock.mockRejectedValue(new Error('RPC timeout'));

    setSecondsSinceCreation(120);
    expect(await getState(2)).toBe(OutgoingMessageState.UNCONFIRMED);

    setSecondsSinceCreation(130);
    expect(await getState(2)).toBe(OutgoingMessageState.UNCONFIRMED);
    expect(statusMock).toHaveBeenCalledTimes(1);
  });
});
