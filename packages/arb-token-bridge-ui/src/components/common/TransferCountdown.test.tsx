import { render, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { MergedTransaction } from '../../state/app/state';
import { TransferCountdown } from './TransferCountdown';

const mocks = vi.hoisted(() => ({
  useTransferDuration: vi.fn(),
}));

vi.mock('../../hooks/useTransferDuration', () => ({
  useTransferDuration: mocks.useTransferDuration,
  minutesToHumanReadableTime: (minutes: number) => `${minutes} minutes`,
}));

const withdrawal = { isWithdrawal: true } as MergedTransaction;

function renderCountdown(estimatedMinutesLeft: number | null) {
  mocks.useTransferDuration.mockReturnValue({ estimatedMinutesLeft });
  const { container } = render(
    <TransferCountdown tx={withdrawal} label="Time left:" textAfterTime="remaining" />,
  );
  return within(container);
}

describe('TransferCountdown', () => {
  it('shows the label and remaining time while within the estimate', () => {
    const view = renderCountdown(5);

    expect(view.getByText('Time left:')).toBeDefined();
    expect(view.getByText('5 minutes remaining')).toBeDefined();
  });

  it('shows taking longer than usual once the estimate has passed', () => {
    const view = renderCountdown(0);

    expect(view.getByText('Taking longer than usual')).toBeDefined();
    expect(view.queryByText('Time left:')).toBeNull();
    expect(view.queryByText(/remaining/)).toBeNull();
  });

  it('keeps the label while calculating', () => {
    const view = renderCountdown(null);

    expect(view.getByText('Time left:')).toBeDefined();
    expect(view.getByText('Calculating...')).toBeDefined();
  });
});
