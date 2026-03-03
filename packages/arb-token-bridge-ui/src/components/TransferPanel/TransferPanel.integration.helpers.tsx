import { registerCustomArbitrumNetwork } from '@arbitrum/sdk';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeAll, expect } from 'vitest';

import { getBridgePageSanitizedRedirectPath } from '../../../../app/src/utils/bridgePageUtils';
import { PathnameEnum } from '../../constants';
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

export type ChainQuerySlug = 'ethereum' | 'arbitrum-one' | 'base' | 'apechain' | 'superposition';
const INTEGRATION_ASSERT_TIMEOUT_MS = 2_000;
const POLL_INTERVAL_MS = 50;
const TOKEN_BUTTON_ASSERT_TIMEOUT_MS = 6_000;

export type TokenExpectation = {
  symbol: string;
  logoURI?: string;
  contractAddress?: string;
};

export type RouteTokenCase = {
  sourceChain: ChainQuerySlug;
  destinationChain: ChainQuerySlug;
  expectedSourceToken: TokenExpectation;
  expectedDestinationToken: TokenExpectation;
};

export const nonConnectedDestinationAddress = 'integration-destination-address';

export const usdcAddressByChain: Record<ChainQuerySlug, string> = {
  'ethereum': CommonAddress.Ethereum.USDC,
  'arbitrum-one': CommonAddress.ArbitrumOne.USDC,
  'base': CommonAddress.Base.USDC,
  'apechain': CommonAddress.ApeChain.USDCe,
  'superposition': CommonAddress.Superposition.USDCe,
};

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function sleepInAct(ms: number) {
  await act(async () => {
    await sleep(ms);
  });
}

async function getSearchParamsAfterSanitization({
  sourceChain,
  destinationChain,
  token,
  destinationToken,
  destinationAddress,
}: {
  sourceChain: ChainQuerySlug;
  destinationChain: ChainQuerySlug;
  token?: string;
  destinationToken?: string;
  destinationAddress: string;
}) {
  const searchParams = {
    sourceChain,
    destinationChain,
    token,
    destinationToken,
    destinationAddress,
  };

  const sanitizedRedirectPath = await getBridgePageSanitizedRedirectPath({
    searchParams,
    redirectPath: PathnameEnum.BRIDGE,
  });

  if (sanitizedRedirectPath) {
    return new URL(sanitizedRedirectPath, 'http://localhost:3000').search;
  }

  return getSearchParams(searchParams);
}

export function getUsdcSourceToken(sourceChain: ChainQuerySlug): ERC20BridgeToken {
  const usesNativeUsdc =
    sourceChain === 'ethereum' || sourceChain === 'arbitrum-one' || sourceChain === 'base';

  return {
    type: TokenType.ERC20,
    decimals: 6,
    name: usesNativeUsdc ? 'USD Coin' : 'Bridged USDC',
    symbol: usesNativeUsdc ? 'USDC' : 'USDC.e',
    address: usdcAddressByChain[sourceChain],
    listIds: new Set<string>(),
  };
}

export async function renderTransferPanel({
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
  const search = await getSearchParamsAfterSanitization({
    sourceChain,
    destinationChain,
    token,
    destinationToken,
    destinationAddress,
  });

  const wrapper = createIntegrationWrapper({
    search,
    bridgeTokens,
  });

  await act(async () => {
    render(<TransferPanel />, { wrapper });
  });

  // Let mount-time effects settle before assertions start.
  await sleepInAct(0);
}

export async function expectTokenButtonToken({
  isDestination,
  tokenExpectation,
}: {
  isDestination: boolean;
  tokenExpectation: TokenExpectation;
}) {
  const buttonAriaLabel = isDestination ? 'Select Destination Token' : 'Select Token';
  const symbolRegex = new RegExp(`\\b${escapeRegExp(tokenExpectation.symbol)}\\b`, 'i');

  type TokenButtonSnapshot = {
    found: boolean;
    buttonText: string;
    symbolText: string;
    logoSrc: string | null;
  };

  const getTokenButtonSnapshot = () => {
    try {
      const latestTokenButton = screen.getByRole('button', {
        name: buttonAriaLabel,
        hidden: true,
      });
      const logoImage = latestTokenButton.querySelector('img');
      const symbolElement = latestTokenButton.querySelector('span.font-light');
      const symbolText = symbolElement?.textContent?.trim() ?? '';

      return {
        found: true,
        buttonText: latestTokenButton.textContent?.trim() ?? '',
        symbolText,
        logoSrc: logoImage?.getAttribute('src') ?? null,
      } satisfies TokenButtonSnapshot;
    } catch {
      return {
        found: false,
        buttonText: '',
        symbolText: '',
        logoSrc: null,
      } satisfies TokenButtonSnapshot;
    }
  };

  const formatTokenButtonSnapshot = (snapshot: TokenButtonSnapshot) => {
    if (!snapshot.found) {
      return 'button not found yet';
    }

    return `symbol=${JSON.stringify(snapshot.symbolText)} rawText=${JSON.stringify(snapshot.buttonText)}`;
  };

  await waitFor(
    () => {
      const snapshot = getTokenButtonSnapshot();
      if (!snapshot.found || !snapshot.symbolText) {
        throw new Error(
          `Waiting for "${buttonAriaLabel}" symbol to resolve. Current state: ${formatTokenButtonSnapshot(snapshot)}.`,
        );
      }

      if (!symbolRegex.test(snapshot.symbolText)) {
        throw new Error(
          `Expected "${buttonAriaLabel}" button text to contain "${tokenExpectation.symbol}", got symbol "${snapshot.symbolText}" (raw: "${snapshot.buttonText}").`,
        );
      }
    },
    {
      timeout: TOKEN_BUTTON_ASSERT_TIMEOUT_MS,
      interval: POLL_INTERVAL_MS,
      onTimeout: () => {
        const snapshot = getTokenButtonSnapshot();
        return new Error(
          `Timed out waiting for "${buttonAriaLabel}" button text to contain "${tokenExpectation.symbol}". Current state: ${formatTokenButtonSnapshot(snapshot)}.`,
        );
      },
    },
  );

  const logoURI = tokenExpectation.logoURI;
  if (logoURI) {
    const logoDeadline = Date.now() + TOKEN_BUTTON_ASSERT_TIMEOUT_MS;
    while (Date.now() < logoDeadline) {
      const snapshot = getTokenButtonSnapshot();

      if (snapshot.logoSrc?.includes(logoURI)) {
        break;
      }

      const hasResolvedWrongLogo = snapshot.found && !!snapshot.logoSrc;

      if (hasResolvedWrongLogo) {
        console.error('[TransferPanel integration debug] Token button logo mismatch', {
          buttonAriaLabel,
          expectedLogoURI: logoURI,
          actualLogoSrc: snapshot.logoSrc,
          buttonText: snapshot.buttonText,
        });

        throw new Error(
          `Found wrong logo in "${buttonAriaLabel}" button. Expected "${logoURI}", got "${snapshot.logoSrc}".`,
        );
      }

      await sleepInAct(POLL_INTERVAL_MS);
    }

    const finalLogoSnapshot = getTokenButtonSnapshot();
    if (!finalLogoSnapshot.logoSrc?.includes(logoURI)) {
      console.error('[TransferPanel integration debug] Token button logo mismatch', {
        buttonAriaLabel,
        expectedLogoURI: logoURI,
        actualLogoSrc: finalLogoSnapshot.logoSrc,
        buttonText: finalLogoSnapshot.buttonText,
      });

      throw new Error(
        `Timed out waiting for "${buttonAriaLabel}" button logo to contain "${logoURI}". Current state: ${formatTokenButtonSnapshot(finalLogoSnapshot)}, current src: ${JSON.stringify(finalLogoSnapshot.logoSrc)}.`,
      );
    }
  }
}

function getTokenPanelRowButtonBySymbol(dialog: HTMLElement, symbol: string): HTMLButtonElement {
  const symbolMatcher = new RegExp(`^${escapeRegExp(symbol)}$`, 'i');
  const symbolElements = within(dialog).queryAllByText(symbolMatcher);

  const rowButton = symbolElements
    .map((element) => element.closest('button'))
    .find(
      (button): button is HTMLButtonElement =>
        button !== null && button.tagName.toLowerCase() === 'button',
    );

  if (!rowButton) {
    throw new Error(`Unable to find token row for symbol "${symbol}".`);
  }

  return rowButton;
}

export async function expectTokenPanelContent({
  isDestination,
  symbolsToContain,
  tokenExpectation,
}: {
  isDestination: boolean;
  symbolsToContain?: string[];
  tokenExpectation?: TokenExpectation;
}) {
  const buttonAriaLabel = isDestination ? 'Select Destination Token' : 'Select Token';
  const dialogTitle = isDestination ? 'Select Destination Token' : 'Select Token';

  const openTokenPanelButton = await screen.findByRole('button', {
    name: buttonAriaLabel,
    hidden: true,
  });
  await act(async () => {
    fireEvent.click(openTokenPanelButton);
  });

  const dialog = await screen.findByRole('dialog');
  await within(dialog).findByText(dialogTitle);

  if (symbolsToContain) {
    const matchers = symbolsToContain.map((symbol) => ({
      symbol,
      matcher: new RegExp(escapeRegExp(symbol), 'i'),
    }));

    await waitFor(
      () => {
        const missingSymbols = matchers
          .filter(
            ({ matcher }) =>
              within(dialog).queryAllByRole('button', { name: matcher }).length === 0,
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
  }

  if (tokenExpectation) {
    if (typeof tokenExpectation.logoURI !== 'undefined') {
      const logoDeadline = Date.now() + INTEGRATION_ASSERT_TIMEOUT_MS;
      while (Date.now() < logoDeadline) {
        const tokenRowButton = getTokenPanelRowButtonBySymbol(dialog, tokenExpectation.symbol);
        const logoImage = tokenRowButton.querySelector('img');
        const rowLogoSrc = logoImage?.getAttribute('src') ?? '';

        if (rowLogoSrc.includes(tokenExpectation.logoURI)) {
          break;
        }

        if (rowLogoSrc) {
          throw new Error(
            `Found wrong logo for "${tokenExpectation.symbol}" row. Expected "${tokenExpectation.logoURI}", got "${rowLogoSrc}".`,
          );
        }

        await sleepInAct(POLL_INTERVAL_MS);
      }

      const tokenRowButton = getTokenPanelRowButtonBySymbol(dialog, tokenExpectation.symbol);
      const logoImage = tokenRowButton.querySelector('img');
      const rowLogoSrc = logoImage?.getAttribute('src') ?? '';
      if (!rowLogoSrc.includes(tokenExpectation.logoURI)) {
        throw new Error(
          `Timed out waiting for "${tokenExpectation.symbol}" row logo to contain "${tokenExpectation.logoURI}".`,
        );
      }
    }

    if (typeof tokenExpectation.contractAddress !== 'undefined') {
      const expectedContractAddress = tokenExpectation.contractAddress.toLowerCase();
      await waitFor(
        () => {
          const tokenRowButton = getTokenPanelRowButtonBySymbol(dialog, tokenExpectation.symbol);
          const links = Array.from(tokenRowButton.querySelectorAll('a[href]'));
          const hasExpectedContractLink = links.some((link) => {
            const href = (link.getAttribute('href') ?? '').toLowerCase();
            return href.includes(`/token/${expectedContractAddress}`);
          });

          expect(hasExpectedContractLink).toBe(true);
        },
        {
          timeout: INTEGRATION_ASSERT_TIMEOUT_MS,
          onTimeout: () =>
            new Error(
              `Timed out waiting for "${tokenExpectation.symbol}" row contract link to include "${tokenExpectation.contractAddress}".`,
            ),
        },
      );
    }
  }

  const closeDialogButton = within(dialog).getByLabelText('Close Dialog');
  await act(async () => {
    fireEvent.click(closeDialogButton);
  });

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

export async function expectTokenPanelSymbol({
  isDestination,
  symbolsToContain,
}: {
  isDestination: boolean;
  symbolsToContain: string[];
}) {
  await expectTokenPanelContent({
    isDestination,
    symbolsToContain,
  });
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
