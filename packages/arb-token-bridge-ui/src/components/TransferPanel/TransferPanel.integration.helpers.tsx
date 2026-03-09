import { registerCustomArbitrumNetwork } from '@arbitrum/sdk';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeAll, expect } from 'vitest';

import { getBridgePageSanitizedRedirectPath } from '../../../../app/src/utils/bridgePageUtils';
import { ETHER_TOKEN_LOGO, PathnameEnum } from '../../constants';
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
const TOKEN_PANEL_CONTENT_ASSERT_TIMEOUT_MS = 8_000;

export type TokenExpectation = {
  symbol: string;
  logoURI?: string;
  contract?: string | 'native';
};

export const APE_TOKEN_LOGO = '/images/ApeTokenLogo.svg';
export const WETH_TOKEN_LOGO =
  'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2/logo.png';
export const USDC_TOKEN_LOGO =
  'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/arbitrum/assets/0xaf88d065e77c8cC2239327C5EDb3A432268e5831/logo.png';

const tokenLogosBySymbol: Record<string, string> = {
  'ETH': ETHER_TOKEN_LOGO,
  'APE': APE_TOKEN_LOGO,
  'WETH': WETH_TOKEN_LOGO,
  'USDC': USDC_TOKEN_LOGO,
  'USDC.e': USDC_TOKEN_LOGO,
};

export function withExpectedTokenLogo(tokenExpectation: TokenExpectation): TokenExpectation {
  if (tokenExpectation.logoURI) {
    return tokenExpectation;
  }

  const logoURI = tokenLogosBySymbol[tokenExpectation.symbol];
  if (!logoURI) {
    return tokenExpectation;
  }

  return {
    ...tokenExpectation,
    logoURI,
  };
}

export type RouteTokenCase = {
  sourceChain: ChainQuerySlug;
  destinationChain: ChainQuerySlug;
  expectedSourceToken: TokenExpectation;
  expectedDestinationToken: TokenExpectation;
};

export type TransferPanelScenarioRenderConfig = {
  sourceChain: ChainQuerySlug;
  destinationChain: ChainQuerySlug;
  token?: string;
  destinationToken?: string;
  bridgeTokens?: ContractStorage<ERC20BridgeToken>;
};

export type TransferPanelScenario = TransferPanelScenarioRenderConfig & {
  name?: string;
  expectedSourceToken: TokenExpectation;
  expectedDestinationToken: TokenExpectation;
  expectedSourcePanelTokens?: TokenExpectation[];
  expectedDestinationPanelTokens?: TokenExpectation[];
};

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
}: {
  sourceChain: ChainQuerySlug;
  destinationChain: ChainQuerySlug;
  token?: string;
  destinationToken?: string;
}) {
  const searchParams = {
    sourceChain,
    destinationChain,
    token,
    destinationToken,
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

function getAutoSeededBridgeTokens({
  sourceChain,
  token,
}: {
  sourceChain: ChainQuerySlug;
  token?: string;
}): ContractStorage<ERC20BridgeToken> | undefined {
  if (!token) {
    return undefined;
  }

  if (token.toLowerCase() !== usdcAddressByChain[sourceChain].toLowerCase()) {
    return undefined;
  }

  return {
    [token.toLowerCase()]: getUsdcSourceToken(sourceChain),
  };
}

export async function renderTransferPanel({
  sourceChain,
  destinationChain,
  token,
  destinationToken,
  bridgeTokens,
}: {
  sourceChain: ChainQuerySlug;
  destinationChain: ChainQuerySlug;
  token?: string;
  destinationToken?: string;
  bridgeTokens?: ContractStorage<ERC20BridgeToken>;
}) {
  const search = await getSearchParamsAfterSanitization({
    sourceChain,
    destinationChain,
    token,
    destinationToken,
  });

  const resolvedBridgeTokens = bridgeTokens ?? getAutoSeededBridgeTokens({ sourceChain, token });

  const wrapper = createIntegrationWrapper({
    search,
    bridgeTokens: resolvedBridgeTokens,
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
    await waitFor(
      () => {
        const snapshot = getTokenButtonSnapshot();
        if (!snapshot.found || !snapshot.logoSrc) {
          throw new Error(
            `Waiting for "${buttonAriaLabel}" logo to resolve. Current state: ${formatTokenButtonSnapshot(snapshot)}.`,
          );
        }

        if (!snapshot.logoSrc.includes(logoURI)) {
          throw new Error(
            `Expected "${buttonAriaLabel}" logo to contain "${logoURI}", got "${snapshot.logoSrc}".`,
          );
        }
      },
      {
        timeout: TOKEN_BUTTON_ASSERT_TIMEOUT_MS,
        interval: POLL_INTERVAL_MS,
        onTimeout: () => {
          const snapshot = getTokenButtonSnapshot();
          return new Error(
            `Timed out waiting for "${buttonAriaLabel}" button logo to contain "${logoURI}". Current state: ${formatTokenButtonSnapshot(snapshot)}, current src: ${JSON.stringify(snapshot.logoSrc)}.`,
          );
        },
      },
    );
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

function getTokenPanelRowButtons(dialog: HTMLElement): HTMLButtonElement[] {
  return within(dialog)
    .queryAllByRole('button')
    .filter((button): button is HTMLButtonElement => {
      if (!(button instanceof HTMLButtonElement)) {
        return false;
      }

      if (button.getAttribute('aria-label') === 'Close Dialog') {
        return false;
      }

      const normalizedText = button.textContent?.replace(/\s+/g, ' ').trim().toLowerCase() ?? '';
      if (!normalizedText) {
        return false;
      }

      if (normalizedText === 'add') {
        return false;
      }

      if (normalizedText.includes('manage token lists')) {
        return false;
      }

      return true;
    });
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
    const getAvailableButtons = () =>
      getTokenPanelRowButtons(dialog)
        .map((button) => button.textContent?.replace(/\s+/g, ' ').trim() ?? '')
        .filter(Boolean)
        .slice(0, 20);

    const getMissingSymbols = () =>
      symbolsToContain.filter((symbol) => {
        try {
          getTokenPanelRowButtonBySymbol(dialog, symbol);
          return false;
        } catch {
          return true;
        }
      });

    await waitFor(
      () => {
        const missingSymbols = getMissingSymbols();
        if (missingSymbols.length > 0) {
          throw new Error(
            `Missing symbol(s) "${missingSymbols.join(', ')}" in ${isDestination ? 'destination' : 'source'} token panel.`,
          );
        }
      },
      {
        timeout: TOKEN_PANEL_CONTENT_ASSERT_TIMEOUT_MS,
        interval: POLL_INTERVAL_MS,
        onTimeout: () => {
          const missingSymbols = getMissingSymbols();
          return new Error(
            `Timed out waiting for [${missingSymbols.join(', ')}] in ${isDestination ? 'destination' : 'source'} token panel. Available rows: [${getAvailableButtons().join(' | ')}].`,
          );
        },
      },
    );
  }

  if (tokenExpectation) {
    if (typeof tokenExpectation.logoURI !== 'undefined') {
      await waitFor(
        () => {
          const tokenRowButton = getTokenPanelRowButtonBySymbol(dialog, tokenExpectation.symbol);
          const logoImage = tokenRowButton.querySelector('img');
          const rowLogoSrc = logoImage?.getAttribute('src') ?? '';

          if (!rowLogoSrc) {
            throw new Error(`Waiting for "${tokenExpectation.symbol}" row logo to resolve.`);
          }

          if (!rowLogoSrc.includes(tokenExpectation.logoURI)) {
            throw new Error(
              `Expected "${tokenExpectation.symbol}" row logo to contain "${tokenExpectation.logoURI}", got "${rowLogoSrc}".`,
            );
          }
        },
        {
          timeout: INTEGRATION_ASSERT_TIMEOUT_MS,
          interval: POLL_INTERVAL_MS,
          onTimeout: () =>
            new Error(
              `Timed out waiting for "${tokenExpectation.symbol}" row logo to contain "${tokenExpectation.logoURI}".`,
            ),
        },
      );
    }

    if (typeof tokenExpectation.contract !== 'undefined') {
      const expectsNativeContract = tokenExpectation.contract === 'native';
      const expectedContractAddress = expectsNativeContract
        ? undefined
        : tokenExpectation.contract.toLowerCase();

      await waitFor(
        () => {
          const tokenRowButton = getTokenPanelRowButtonBySymbol(dialog, tokenExpectation.symbol);
          const links = Array.from(tokenRowButton.querySelectorAll('a[href]'));
          const rowText = (tokenRowButton.textContent ?? '').toLowerCase();
          const hasAnyTokenContractLink = links.some((link) => {
            const href = (link.getAttribute('href') ?? '').toLowerCase();
            return href.includes('/token/');
          });
          const hasExpectedContractLink = links.some((link) => {
            const href = (link.getAttribute('href') ?? '').toLowerCase();
            return expectedContractAddress
              ? href.includes(`/token/${expectedContractAddress}`)
              : false;
          });

          if (expectsNativeContract) {
            expect(rowText).toContain('native token on');
            expect(hasAnyTokenContractLink).toBe(false);
            return;
          }

          expect(hasExpectedContractLink).toBe(true);
        },
        {
          timeout: INTEGRATION_ASSERT_TIMEOUT_MS,
          onTimeout: () =>
            new Error(
              expectsNativeContract
                ? `Timed out waiting for "${tokenExpectation.symbol}" row to show native token text without token contract links.`
                : `Timed out waiting for "${tokenExpectation.symbol}" row contract link to include "${tokenExpectation.contract}".`,
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

async function expectTokenPanelTokens({
  isDestination,
  tokenExpectations,
  scenarioName,
}: {
  isDestination: boolean;
  tokenExpectations: TokenExpectation[];
  scenarioName: string;
}) {
  const primaryTokenExpectation = tokenExpectations[0];
  if (!primaryTokenExpectation) {
    throw new Error(
      `Missing primary ${isDestination ? 'destination' : 'source'} panel token expectation for scenario "${scenarioName}".`,
    );
  }

  await expectTokenPanelContent({
    isDestination,
    symbolsToContain: tokenExpectations.map(({ symbol }) => symbol),
    tokenExpectation: withExpectedTokenLogo(primaryTokenExpectation),
  });
}

export async function runTransferPanelScenario({
  name,
  expectedSourceToken,
  expectedDestinationToken,
  expectedSourcePanelTokens,
  expectedDestinationPanelTokens,
  ...renderConfig
}: TransferPanelScenario) {
  const scenarioName = name ?? `${renderConfig.sourceChain} -> ${renderConfig.destinationChain}`;

  await renderTransferPanel(renderConfig);

  await expectTokenButtonToken({
    isDestination: false,
    tokenExpectation: withExpectedTokenLogo(expectedSourceToken),
  });
  await expectTokenButtonToken({
    isDestination: true,
    tokenExpectation: withExpectedTokenLogo(expectedDestinationToken),
  });

  if (expectedSourcePanelTokens) {
    await expectTokenPanelTokens({
      isDestination: false,
      tokenExpectations: expectedSourcePanelTokens,
      scenarioName,
    });
  }

  if (expectedDestinationPanelTokens) {
    await expectTokenPanelTokens({
      isDestination: true,
      tokenExpectations: expectedDestinationPanelTokens,
      scenarioName,
    });
  }
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
