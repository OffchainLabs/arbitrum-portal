import { act, fireEvent, screen, within } from '@testing-library/react';
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
const usdgEthereumRowTokenExpectation = {
  symbol: 'USDG',
  logoURI:
    'https://static.debank.com/image/eth_token/logo_url/0xe343167631d89b6ffc58b88d6b7fb0228795491d/4cbeae5d28b9db12bcf655fae7a328bb.png',
};

/**
 * LiFi lists no non-USDG stablecoin from the allowlist on Robinhood Chain, so the banner cannot be
 * shown against the live token lists for that destination; those visible cases (switch, dismiss,
 * tracking) live in the unit tests for `useUsdgSuggestion`. Arbitrum One has plenty of listed
 * stablecoins, so the visible path is covered end to end there.
 */
describe.sequential('TransferPanel LiFi Integration - USDG suggestion banner', () => {
  setupTransferPanelLifiIntegrationSuite();

  it('shows for a USDC deposit into Arbitrum One and switches the destination to USDG', async () => {
    await renderTransferPanel({
      sourceChain: 'ethereum',
      destinationChain: 'arbitrum-one',
      token: CommonAddress.Ethereum.USDC,
      destinationToken: CommonAddress.Ethereum.USDC,
    });

    await expectTokenButtonContent({
      isDestination: true,
      tokenExpectation: tokenExpectationsByChain.Ethereum.USDC,
    });
    const banner = await screen.findByRole('note', { name: BANNER_NAME });
    expect(banner.textContent).toContain("USDG is Arbitrum One's native stablecoin");

    await act(async () => {
      fireEvent.click(within(banner).getByRole('button', { name: /Switch to USDG/ }));
    });

    await expectTokenButtonContent({
      isDestination: true,
      tokenExpectation: usdgEthereumRowTokenExpectation,
    });
    expect(screen.queryByRole('note', { name: BANNER_NAME })).toBeNull();
  });

  it('stays hidden for a USDC deposit into Arbitrum One from Base, which has no USDG', async () => {
    await renderTransferPanel({
      sourceChain: 'base',
      destinationChain: 'arbitrum-one',
      token: CommonAddress.Base.USDC,
      destinationToken: CommonAddress.Base.USDC,
    });

    await expectTokenButtonContent({
      isDestination: true,
      tokenExpectation: tokenExpectationsByChain.ArbitrumOne.USDC,
    });
    expect(screen.queryByRole('note', { name: BANNER_NAME })).toBeNull();
  });

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
