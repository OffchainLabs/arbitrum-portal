import { screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
  expectTokenPanelContent,
  nativeEthTokenExpectation,
  renderTransferPanel,
  setupTransferPanelLifiIntegrationSuite,
} from './TransferPanel.integration.helpers';

/**
 * Arbitrum Nova is in a minimized state: deposits are ETH-only and capped. Withdrawals out of Nova
 * must keep working exactly as before.
 */
describe.sequential('TransferPanel Nova minimized state', () => {
  setupTransferPanelLifiIntegrationSuite();

  it('shows only ETH in the source token panel when depositing into Nova', async () => {
    await renderTransferPanel({
      sourceChain: 'ethereum',
      destinationChain: 'arbitrum-nova',
    });

    await expectTokenPanelContent({
      isDestination: false,
      symbolsToContain: ['ETH'],
      symbolsToExclude: ['USDC', 'USDT', 'WETH', 'ARB'],
      tokenExpectations: [nativeEthTokenExpectation],
    });
  });

  /**
   * The asset received is always ETH, so there is nothing to pick. The LiFi route itself stays
   * eligible - only the picker is disabled.
   */
  it('disables the destination token picker when depositing into Nova', async () => {
    await renderTransferPanel({
      sourceChain: 'ethereum',
      destinationChain: 'arbitrum-nova',
    });

    const destinationTokenButton = await screen.findByRole('button', {
      name: 'Select Destination Token',
      hidden: true,
    });

    await waitFor(() => {
      expect(destinationTokenButton.hasAttribute('disabled')).toBe(true);
    });
  });

  it('renders the minimized-state warning when Nova is the destination', async () => {
    await renderTransferPanel({
      sourceChain: 'ethereum',
      destinationChain: 'arbitrum-nova',
    });

    expect(await screen.findByText(/Arbitrum Nova is in a minimized state/i)).toBeTruthy();
  });

  /**
   * The must-not-regress case. Asserted through the destination token picker rather than the source
   * token panel: Nova-as-source pulls canonical Nova token lists that do not resolve under test.
   */
  it('leaves the destination token picker enabled when withdrawing from Nova to Ethereum', async () => {
    await renderTransferPanel({
      sourceChain: 'arbitrum-nova',
      destinationChain: 'ethereum',
    });

    const destinationTokenButton = await screen.findByRole('button', {
      name: 'Select Destination Token',
      hidden: true,
    });

    await waitFor(() => {
      expect(destinationTokenButton.hasAttribute('disabled')).toBe(false);
    });
  });

  it('does not show the minimized-state warning when withdrawing from Nova', async () => {
    await renderTransferPanel({
      sourceChain: 'arbitrum-nova',
      destinationChain: 'ethereum',
    });

    expect(screen.queryByText(/Arbitrum Nova is in a minimized state/i)).toBeNull();
  });
});
