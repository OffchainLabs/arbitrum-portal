import { screen } from '@testing-library/react';
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

/**
 * LiFi lists no non-USDG stablecoin from the allowlist on Robinhood Chain, so the banner cannot be
 * shown against the live token lists. The visible cases (switch, dismiss, tracking) live in the
 * unit tests for `useUsdgSuggestion`; these cover the hidden cases end to end.
 */
describe.sequential('TransferPanel LiFi Integration - USDG suggestion banner', () => {
  setupTransferPanelLifiIntegrationSuite();

  it('stays hidden when a stablecoin source lands on native ETH on Robinhood Chain', async () => {
    await renderTransferPanel({
      sourceChain: 'arbitrum-one',
      destinationChain: 'robinhood-chain',
      token: CommonAddress.ArbitrumOne.USDC,
    });

    await expectTokenButtonContent({
      isDestination: true,
      tokenExpectation: nativeEthTokenExpectation,
    });
    expect(screen.queryByRole('note', { name: BANNER_NAME })).toBeNull();
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
