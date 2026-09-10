import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { CommonAddress } from '../../util/CommonAddressUtils';
import {
  expectTokenButtonContent,
  nativeEthTokenExpectation,
  renderTransferPanel,
  setupTransferPanelLifiIntegrationSuite,
  tokenExpectationsByChain,
} from './TransferPanel.integration.helpers';

const BANNER_NAME = 'USDG suggestion';
const BANNER_ASSERT_TIMEOUT_MS = 8_000;

describe.sequential('TransferPanel LiFi Integration - USDG suggestion banner', () => {
  setupTransferPanelLifiIntegrationSuite();

  it('offers USDG when a stablecoin source falls back to ETH on Robinhood Chain and switches the destination on click', async () => {
    await renderTransferPanel({
      sourceChain: 'arbitrum-one',
      destinationChain: 'robinhood-chain',
      token: CommonAddress.ArbitrumOne.USDC,
    });

    await expectTokenButtonContent({
      isDestination: true,
      tokenExpectation: nativeEthTokenExpectation,
    });

    const banner = await screen.findByRole(
      'note',
      { name: BANNER_NAME },
      { timeout: BANNER_ASSERT_TIMEOUT_MS },
    );
    expect(banner.textContent?.replace(/\s+/g, ' ')).toContain('Most Robinhood apps use USDG.');

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Switch to USDG/ }));
    });

    await expectTokenButtonContent({
      isDestination: true,
      tokenExpectation: tokenExpectationsByChain.RobinhoodChain.USDG,
    });
    await waitFor(() => {
      expect(screen.queryByRole('note', { name: BANNER_NAME })).toBeNull();
    });
  });

  it('stays hidden for a USDe transfer into Robinhood Chain', async () => {
    await renderTransferPanel({
      sourceChain: 'arbitrum-one',
      destinationChain: 'robinhood-chain',
      token: CommonAddress.ArbitrumOne.USDe,
      destinationToken: CommonAddress.ArbitrumOne.USDe,
    });

    await expectTokenButtonContent({
      isDestination: true,
      tokenExpectation: tokenExpectationsByChain.ArbitrumOne.USDe,
    });
    expect(screen.queryByRole('note', { name: BANNER_NAME })).toBeNull();
  });

  it('stays hidden when USDG is already the destination', async () => {
    await renderTransferPanel({
      sourceChain: 'arbitrum-one',
      destinationChain: 'robinhood-chain',
      token: CommonAddress.ArbitrumOne.USDC,
      destinationToken: 'usdg',
    });

    await expectTokenButtonContent({
      isDestination: true,
      tokenExpectation: tokenExpectationsByChain.RobinhoodChain.USDG,
    });
    expect(screen.queryByRole('note', { name: BANNER_NAME })).toBeNull();
  });
});
