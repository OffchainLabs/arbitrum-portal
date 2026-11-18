import { render, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { MergedTransaction } from '../../state/app/state';
import { TransferCountdown } from './TransferCountdown';

const mocks = vi.hoisted(() => ({
  useTransferDuration: vi.fn(),
}));

vi.mock('../../hooks/useTransferDuration', () => ({
  useTransferDuration: mocks.useTransferDuration,
  minutesToHumanReadableTime: (minutes: number) =>
    minutes === 0 ? 'Less than a minute' : `${minutes} minutes`,
}));

const withdrawal = { isWithdrawal: true } as MergedTransaction;

function renderCountdown({
  estimatedMinutesLeft,
  minutesPastEstimate = 0,
  bufferMinutes,
}: {
  estimatedMinutesLeft: number | null;
  minutesPastEstimate?: number | null;
  bufferMinutes?: number;
}) {
  mocks.useTransferDuration.mockReturnValue({ estimatedMinutesLeft, minutesPastEstimate });
  const { container } = render(
    <TransferCountdown
      tx={withdrawal}
      label="Time left:"
      textAfterTime="remaining"
      bufferMinutes={bufferMinutes}
    />,
  );
  return within(container);
}

describe('TransferCountdown', () => {
  it('shows the label and remaining time while within the estimate', () => {
    const view = renderCountdown({ estimatedMinutesLeft: 5 });

    expect(view.getByText('Time left:')).toBeDefined();
    expect(view.getByText('5 minutes remaining')).toBeDefined();
  });

  it('keeps showing less than a minute within the buffer after the estimate', () => {
    const view = renderCountdown({ estimatedMinutesLeft: 0, minutesPastEstimate: 9 });

    expect(view.getByText('Time left:')).toBeDefined();
    expect(view.getByText('Less than a minute remaining')).toBeDefined();
  });

  it('shows taking longer than usual once the buffer has passed', () => {
    const view = renderCountdown({ estimatedMinutesLeft: 0, minutesPastEstimate: 10 });

    expect(view.getByText('Taking longer than usual')).toBeDefined();
    expect(view.queryByText('Time left:')).toBeNull();
    expect(view.queryByText(/remaining/)).toBeNull();
  });

  it('uses a custom buffer', () => {
    const view = renderCountdown({
      estimatedMinutesLeft: 0,
      minutesPastEstimate: 2,
      bufferMinutes: 2,
    });

    expect(view.getByText('Taking longer than usual')).toBeDefined();
  });

  it('never shows taking longer than usual without a past-estimate value', () => {
    const view = renderCountdown({ estimatedMinutesLeft: 0, minutesPastEstimate: null });

    expect(view.getByText('Less than a minute remaining')).toBeDefined();
  });

  it('keeps the label while calculating', () => {
    const view = renderCountdown({ estimatedMinutesLeft: null, minutesPastEstimate: null });

    expect(view.getByText('Time left:')).toBeDefined();
    expect(view.getByText('Calculating...')).toBeDefined();
  });
});
