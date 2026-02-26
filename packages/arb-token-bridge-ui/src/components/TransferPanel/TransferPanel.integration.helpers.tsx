import { registerCustomArbitrumNetwork } from '@arbitrum/sdk';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeAll, expect } from 'vitest';

import { ContractStorage, ERC20BridgeToken, TokenType } from '../../hooks/arbTokenBridge.types';
import {
  createIntegrationWrapper,
  getSearchParams,
} from '../../test-utils/integration-test-wrapper';
import { ChainId } from '../../types/ChainId';
import { CommonAddress } from '../../util/CommonAddressUtils';
import { mapCustomChainToNetworkData } from '../../util/networks';
import orbitChainsData from '../../util/orbitChainsData.json';
import { TransferPanel } from './TransferPanel';

export type ChainQuerySlug = 'ethereum' | 'apechain' | 'superposition';
type ExpectedSymbol = 'USDC' | 'USDC.e' | 'USDT' | 'ETH' | 'WETH' | 'APE';
const INTEGRATION_ASSERT_TIMEOUT_MS = 50_000;

export type RouteTokenCase = {
  sourceChain: ChainQuerySlug;
  destinationChain: ChainQuerySlug;
  expectedSourceSymbol: ExpectedSymbol;
  expectedDestinationSymbol: ExpectedSymbol;
  expectedSourcePanelSymbols?: ExpectedSymbol[];
  expectedDestinationPanelSymbols?: ExpectedSymbol[];
};

export const nonConnectedDestinationAddress = 'integration-destination-address';

export const usdcAddressByChain: Record<ChainQuerySlug, string> = {
  ethereum: CommonAddress.Ethereum.USDC,
  apechain: CommonAddress.ApeChain.USDCe,
  superposition: CommonAddress.Superposition.USDCe,
};

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function getUsdcSourceToken(sourceChain: ChainQuerySlug): ERC20BridgeToken {
  const isEthereum = sourceChain === 'ethereum';
  return {
    type: TokenType.ERC20,
    decimals: 6,
    name: isEthereum ? 'USD Coin' : 'Bridged USDC',
    symbol: isEthereum ? 'USDC' : 'USDC.e',
    address: usdcAddressByChain[sourceChain],
    listIds: new Set<string>(),
  };
}

export function renderTransferPanel({
  sourceChain,
  destinationChain,
  token,
  destinationToken,
  bridgeTokens,
  destinationAddress,
}: {
  sourceChain: ChainQuerySlug;
  destinationChain: ChainQuerySlug;
  token?: string;
  destinationToken?: string;
  bridgeTokens?: ContractStorage<ERC20BridgeToken>;
  destinationAddress: string;
}) {
  const wrapper = createIntegrationWrapper({
    search: getSearchParams({
      sourceChain,
      destinationChain,
      token,
      destinationToken,
      destinationAddress,
    }),
    bridgeTokens,
  });

  render(<TransferPanel />, { wrapper });
}

export async function expectTokenButtonSymbol({
  isDestination,
  symbol,
}: {
  isDestination: boolean;
  symbol: string;
}) {
  const buttonAriaLabel = isDestination ? 'Select Destination Token' : 'Select Token';
  const tokenButton = await screen.findByRole('button', { name: buttonAriaLabel, hidden: true });
  await waitFor(
    () => {
      expect(tokenButton.textContent).toContain(symbol);
    },
    {
      timeout: INTEGRATION_ASSERT_TIMEOUT_MS,
      onTimeout: () =>
        new Error(`Timed out waiting for "${buttonAriaLabel}" button text to contain "${symbol}".`),
    },
  );
}

export async function expectTokenPanelSymbol({
  isDestination,
  symbolsToContain,
}: {
  isDestination: boolean;
  symbolsToContain: string[];
}) {
  const buttonAriaLabel = isDestination ? 'Select Destination Token' : 'Select Token';
  const dialogTitle = isDestination ? 'Select Destination Token' : 'Select Token';

  fireEvent.click(await screen.findByRole('button', { name: buttonAriaLabel, hidden: true }));

  const dialog = await screen.findByRole('dialog');
  await within(dialog).findByText(dialogTitle);

  const matchers = symbolsToContain.map((symbol) => ({
    symbol,
    matcher: new RegExp(escapeRegExp(symbol), 'i'),
  }));

  await waitFor(
    () => {
      const missingSymbols = matchers
        .filter(
          ({ matcher }) => within(dialog).queryAllByRole('button', { name: matcher }).length === 0,
        )
        .map(({ symbol }) => symbol);

      if (missingSymbols.length > 0) {
        throw new Error(
          `Missing symbol(s) "${missingSymbols.join(', ')}" in ${isDestination ? 'destination' : 'source'} token panel.`,
        );
      }
    },
    {
      timeout: INTEGRATION_ASSERT_TIMEOUT_MS,
      onTimeout: () =>
        new Error(
          `Timed out waiting for [${symbolsToContain.join(', ')}] in ${isDestination ? 'destination' : 'source'} token panel.`,
        ),
    },
  );

  fireEvent.click(within(dialog).getByLabelText('Close Dialog'));

  await waitFor(
    () => {
      expect(screen.queryByRole('dialog')).toBeNull();
    },
    {
      timeout: INTEGRATION_ASSERT_TIMEOUT_MS,
      onTimeout: () => new Error('Timed out waiting for token selection dialog to close.'),
    },
  );
}

export function setupTransferPanelLifiIntegrationSuite() {
  beforeAll(() => {
    process.env.NEXT_PUBLIC_FEATURE_FLAG_LIFI = 'true';

    const apeChain = orbitChainsData.mainnet.find((chain) => chain.chainId === ChainId.ApeChain)!;
    const superposition = orbitChainsData.mainnet.find(
      (chain) => chain.chainId === ChainId.Superposition,
    )!;

    registerCustomArbitrumNetwork(apeChain);
    registerCustomArbitrumNetwork(superposition);
    mapCustomChainToNetworkData(apeChain);
    mapCustomChainToNetworkData(superposition);
  });
}
