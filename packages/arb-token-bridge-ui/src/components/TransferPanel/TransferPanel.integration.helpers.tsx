import { registerCustomArbitrumNetwork } from '@arbitrum/sdk';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeAll, expect } from 'vitest';

import { addOrbitChainsToArbitrumSDK } from '../../../../app/src/initialization';
import { getSanitizedRedirectPath } from '../../../../app/src/utils/sanitizeAndRedirect';
import { ETHER_TOKEN_LOGO, PathnameEnum } from '../../constants';
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
const TOKEN_LIST_LOAD_TIMEOUT_MS = 15_000;

export type TokenExpectation = {
  symbol: string;
  logoURI?: string;
  contract?: string | 'native';
};
export type TokenExpectationWithLogo = TokenExpectation & { logoURI: string };
export type TokenPanelExpectation = TokenExpectationWithLogo & {
  contract: NonNullable<TokenExpectation['contract']>;
};
export type TokenPanelExpectations = [TokenPanelExpectation, ...TokenPanelExpectation[]];

export const APE_TOKEN_LOGO = '/images/ApeTokenLogo.svg';
export const WETH_TOKEN_LOGO =
  'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2/logo.png';
export const USDC_TOKEN_LOGO =
  'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/arbitrum/assets/0xaf88d065e77c8cC2239327C5EDb3A432268e5831/logo.png';
export const USDT_TOKEN_LOGO =
  'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xdAC17F958D2ee523a2206206994597C13D831ec7/logo.png';
export const WETH_SUPERPOSITION_ROW_LOGO =
  'https://static.debank.com/image/eth_token/logo_url/0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2/61844453e63cf81301f845d7864236f6.png';
export const USDT_ARBITRUM_ONE_ROW_LOGO =
  'https://static.debank.com/image/ink_token/logo_url/0x0200c29006150606b650577bbe7b6248f58470c1/8bba37fddc2774e06a94b8952e3e3ad7.png';

const tokenLogosBySymbol: Record<string, string> = {
  'ETH': ETHER_TOKEN_LOGO,
  'APE': APE_TOKEN_LOGO,
  'WETH': WETH_TOKEN_LOGO,
  'USDC': USDC_TOKEN_LOGO,
  'USDC.e': USDC_TOKEN_LOGO,
  'USDT': USDT_TOKEN_LOGO,
};

export function withContract(
  tokenExpectation: TokenExpectationWithLogo,
  contract: TokenPanelExpectation['contract'],
): TokenPanelExpectation {
  return {
    ...tokenExpectation,
    contract,
  };
}

export const ethTokenExpectation = {
  symbol: 'ETH',
  logoURI: ETHER_TOKEN_LOGO,
} satisfies TokenExpectationWithLogo;
export const nativeEthTokenExpectation = {
  ...ethTokenExpectation,
  contract: 'native',
} satisfies TokenPanelExpectation;
export const apeTokenExpectation = {
  symbol: 'APE',
  logoURI: APE_TOKEN_LOGO,
} satisfies TokenExpectationWithLogo;
export const nativeApeTokenExpectation = {
  ...apeTokenExpectation,
  contract: 'native',
} satisfies TokenPanelExpectation;
export const usdcTokenExpectation = {
  symbol: 'USDC',
  logoURI: USDC_TOKEN_LOGO,
} satisfies TokenExpectationWithLogo;
export const usdcETokenExpectation = {
  symbol: 'USDC.e',
  logoURI: USDC_TOKEN_LOGO,
} satisfies TokenExpectationWithLogo;
export const usdtTokenExpectation = {
  symbol: 'USDT',
  logoURI: USDT_TOKEN_LOGO,
} satisfies TokenExpectationWithLogo;
export const wethTokenExpectation = {
  symbol: 'WETH',
  logoURI: WETH_TOKEN_LOGO,
} satisfies TokenExpectationWithLogo;
export const wethSuperpositionRowTokenExpectation = {
  symbol: 'WETH',
  logoURI: WETH_SUPERPOSITION_ROW_LOGO,
} satisfies TokenExpectationWithLogo;
export const usdtArbitrumOneRowTokenExpectation = {
  symbol: 'USDT',
  logoURI: USDT_ARBITRUM_ONE_ROW_LOGO,
} satisfies TokenExpectationWithLogo;

export const apeTokenByChain = {
  ethereum: withContract(apeTokenExpectation, CommonAddress.Ethereum.APE),
  arbitrumOne: withContract(apeTokenExpectation, CommonAddress.ArbitrumOne.APE),
  base: withContract(apeTokenExpectation, CommonAddress.Base.APE),
  apeChain: nativeApeTokenExpectation,
};
export const usdcTokenByChain = {
  ethereum: withContract(usdcTokenExpectation, CommonAddress.Ethereum.USDC),
  arbitrumOne: withContract(usdcTokenExpectation, CommonAddress.ArbitrumOne.USDC),
  apeChain: withContract(usdcETokenExpectation, CommonAddress.ApeChain.USDCe),
  superposition: withContract(usdcETokenExpectation, CommonAddress.Superposition.USDCe),
};
export const usdtTokenByChain = {
  ethereum: withContract(usdtTokenExpectation, CommonAddress.Ethereum.USDT),
  arbitrumOne: withContract(usdtTokenExpectation, CommonAddress.ArbitrumOne.USDT),
  apeChain: withContract(usdtTokenExpectation, CommonAddress.ApeChain.USDT),
};
export const wethTokenByChain = {
  ethereum: withContract(wethTokenExpectation, CommonAddress.Ethereum.WETH),
  arbitrumOne: withContract(wethTokenExpectation, CommonAddress.ArbitrumOne.WETH),
  apeChain: withContract(wethTokenExpectation, CommonAddress.ApeChain.WETH),
  superposition: withContract(wethTokenExpectation, CommonAddress.Superposition.WETH),
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

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function withoutTestingLibraryDom(error: Error): Error {
  const htmlIndex = error.message.indexOf('\n\n<html');
  const sanitizedMessage = htmlIndex === -1 ? error.message : error.message.slice(0, htmlIndex);
  return new Error(sanitizedMessage);
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

  addOrbitChainsToArbitrumSDK();

  const sanitizedRedirectPath = await getSanitizedRedirectPath(searchParams, PathnameEnum.BRIDGE);

  if (sanitizedRedirectPath) {
    return new URL(sanitizedRedirectPath, 'http://localhost:3000').search;
  }

  return getSearchParams(searchParams);
}

export async function renderTransferPanel({
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
  const search = await getSearchParamsAfterSanitization({
    sourceChain,
    destinationChain,
    token,
    destinationToken,
  });

  const wrapper = createIntegrationWrapper({
    search,
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

  type TokenButtonSnapshot = {
    buttonText: string;
    symbolText: string;
    logoSrc: string | null;
  };

  const getTokenButtonSnapshot = () => {
    const latestTokenButton = screen.queryByRole('button', {
      name: buttonAriaLabel,
      hidden: true,
    });

    if (!latestTokenButton) {
      return {
        buttonText: '',
        symbolText: '',
        logoSrc: null,
      } satisfies TokenButtonSnapshot;
    }

    const logoImage = latestTokenButton.querySelector('img');
    const symbolElement = latestTokenButton.querySelector('span.font-light');

    return {
      buttonText: latestTokenButton.textContent?.trim() ?? '',
      symbolText: symbolElement?.textContent?.trim() ?? '',
      logoSrc: logoImage?.getAttribute('src') ?? null,
    } satisfies TokenButtonSnapshot;
  };

  await waitFor(
    () => {
      const snapshot = getTokenButtonSnapshot();
      expect(snapshot.symbolText).toBeTruthy();
      expect(snapshot.symbolText).toEqual(tokenExpectation.symbol);
    },
    {
      timeout: TOKEN_BUTTON_ASSERT_TIMEOUT_MS,
      interval: POLL_INTERVAL_MS,
      onTimeout: withoutTestingLibraryDom,
    },
  );

  const logoURI = tokenExpectation.logoURI;
  if (logoURI) {
    await waitFor(
      () => {
        const snapshot = getTokenButtonSnapshot();
        expect(snapshot.logoSrc).toBeTruthy();
        expect(snapshot.logoSrc).toContain(logoURI);
      },
      {
        timeout: TOKEN_BUTTON_ASSERT_TIMEOUT_MS,
        interval: POLL_INTERVAL_MS,
        onTimeout: () => {
          const snapshot = getTokenButtonSnapshot();
          return new Error(
            `Expected ${isDestination ? 'destination' : 'source'} token button logo to contain ${JSON.stringify(logoURI)}, received ${JSON.stringify(snapshot.logoSrc)}.`,
          );
        },
      },
    );
  }
}

function queryTokenPanelRowButtonBySymbol(
  dialog: HTMLElement,
  symbol: string,
): HTMLButtonElement | null {
  const symbolMatcher = new RegExp(`^${escapeRegExp(symbol)}$`, 'i');
  const symbolElements = within(dialog).queryAllByText(symbolMatcher);

  return (
    symbolElements
      .map((element) => element.closest('button'))
      .find(
        (button): button is HTMLButtonElement =>
          button !== null && button.tagName.toLowerCase() === 'button',
      ) ?? null
  );
}

function getTokenPanelRowButtonBySymbol(dialog: HTMLElement, symbol: string): HTMLButtonElement {
  const rowButton = queryTokenPanelRowButtonBySymbol(dialog, symbol);
  expect(rowButton !== null).toBe(true);
  return rowButton as HTMLButtonElement;
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

function formatTokenPanelRowText(button: HTMLButtonElement): string {
  const normalizeText = (value: string | null | undefined) =>
    value?.replace(/\s+/g, ' ').trim() ?? '';
  const symbolText = normalizeText(
    button.querySelector('span.text-base.font-medium.leading-none')?.textContent,
  );
  const rowInfoContainers = button.querySelectorAll('div.text-left.flex.items-center');
  const subtitleText = normalizeText(rowInfoContainers.item(1)?.textContent);

  if (symbolText && subtitleText) {
    return `${symbolText} - ${subtitleText}`;
  }

  return symbolText || normalizeText(button.textContent);
}

function getTokenPanelRowTexts(dialog: HTMLElement): string[] {
  return getTokenPanelRowButtons(dialog).map(formatTokenPanelRowText).filter(Boolean);
}

async function waitForTokenPanelToFinishLoading(dialog: HTMLElement) {
  await waitFor(
    () => {
      expect(within(dialog).queryByText('Fetching Tokens...')).toBeNull();
    },
    {
      timeout: TOKEN_LIST_LOAD_TIMEOUT_MS,
      interval: POLL_INTERVAL_MS,
      onTimeout: withoutTestingLibraryDom,
    },
  );
}

export async function expectTokenPanelContent({
  isDestination,
  symbolsToContain,
  tokenExpectations,
}: {
  isDestination: boolean;
  symbolsToContain?: string[];
  tokenExpectations?: TokenExpectation[];
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
  await waitForTokenPanelToFinishLoading(dialog);

  if (symbolsToContain) {
    const getMissingSymbols = () =>
      symbolsToContain.filter(
        (symbol) => queryTokenPanelRowButtonBySymbol(dialog, symbol) === null,
      );

    await waitFor(
      () => {
        expect(getMissingSymbols()).toEqual([]);
      },
      {
        timeout: TOKEN_PANEL_CONTENT_ASSERT_TIMEOUT_MS,
        interval: POLL_INTERVAL_MS,
        onTimeout: () =>
          new Error(
            `Expected token panel to contain ${JSON.stringify(symbolsToContain)}, received rows ${JSON.stringify(getTokenPanelRowTexts(dialog))}. isDestination=${JSON.stringify(isDestination)} title=${JSON.stringify(dialogTitle)} text=${JSON.stringify(dialog.textContent?.replace(/\s+/g, ' ').trim())}`,
          ),
      },
    );
  }

  const expectedTokenLogos =
    tokenExpectations?.filter(({ logoURI }) => typeof logoURI !== 'undefined') ?? [];
  await Promise.all(
    expectedTokenLogos.map((tokenExpectation) =>
      waitFor(
        () => {
          const tokenRowButton = getTokenPanelRowButtonBySymbol(dialog, tokenExpectation.symbol);
          const logoImage = tokenRowButton.querySelector('img');
          const rowLogoSrc = logoImage?.getAttribute('src') ?? '';
          expect(rowLogoSrc).toBeTruthy();
          expect(rowLogoSrc).toContain(tokenExpectation.logoURI);
        },
        {
          timeout: INTEGRATION_ASSERT_TIMEOUT_MS,
          interval: POLL_INTERVAL_MS,
          onTimeout: () => {
            const tokenRowButton = queryTokenPanelRowButtonBySymbol(
              dialog,
              tokenExpectation.symbol,
            );
            const rowLogoSrc = tokenRowButton?.querySelector('img')?.getAttribute('src') ?? null;

            return new Error(
              `Expected "${tokenExpectation.symbol}" row logo to contain ${JSON.stringify(tokenExpectation.logoURI)}, received ${JSON.stringify(rowLogoSrc)}.`,
            );
          },
        },
      ),
    ),
  );

  const expectedTokenContracts =
    tokenExpectations?.filter(
      (tokenExpectation): tokenExpectation is TokenExpectation & { contract: string } =>
        typeof tokenExpectation.contract !== 'undefined',
    ) ?? [];
  await Promise.all(
    expectedTokenContracts.map((tokenExpectation) => {
      const expectsNativeContract = tokenExpectation.contract === 'native';
      const expectedContractAddress = expectsNativeContract
        ? undefined
        : tokenExpectation.contract.toLowerCase();

      return waitFor(
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
          onTimeout: () => {
            const tokenRowButton = queryTokenPanelRowButtonBySymbol(
              dialog,
              tokenExpectation.symbol,
            );
            const contractHrefs =
              tokenRowButton === null
                ? []
                : Array.from(tokenRowButton.querySelectorAll('a[href]')).map(
                    (link) => link.getAttribute('href') ?? '',
                  );

            return new Error(
              expectsNativeContract
                ? `Timed out waiting for "${tokenExpectation.symbol}" row to show native token text without token contract links. Received hrefs ${JSON.stringify(contractHrefs)}.`
                : `Timed out waiting for "${tokenExpectation.symbol}" row contract link to include "${tokenExpectation.contract}". Received hrefs ${JSON.stringify(contractHrefs)}.`,
            );
          },
        },
      );
    }),
  );

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
      onTimeout: withoutTestingLibraryDom,
    },
  );
}

export async function selectTokenPanelToken({
  isDestination,
  tokenExpectation,
}: {
  isDestination: boolean;
  tokenExpectation: TokenExpectation;
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
  await waitForTokenPanelToFinishLoading(dialog);

  const searchInput = within(dialog).queryByPlaceholderText(
    'Search by token name, symbol, or address',
  );

  if (searchInput instanceof HTMLInputElement) {
    const searchValue =
      tokenExpectation.contract && tokenExpectation.contract !== 'native'
        ? tokenExpectation.contract
        : tokenExpectation.symbol;

    await act(async () => {
      fireEvent.change(searchInput, { target: { value: searchValue } });
    });
  }

  await waitFor(
    () => {
      expect(queryTokenPanelRowButtonBySymbol(dialog, tokenExpectation.symbol) !== null).toBe(true);
    },
    {
      timeout: TOKEN_PANEL_CONTENT_ASSERT_TIMEOUT_MS,
      interval: POLL_INTERVAL_MS,
      onTimeout: () =>
        new Error(
          `Expected ${isDestination ? 'destination' : 'source'} token panel to contain ${JSON.stringify(tokenExpectation.symbol)}, received rows ${JSON.stringify(getTokenPanelRowTexts(dialog))}.`,
        ),
    },
  );

  const tokenRowButton = getTokenPanelRowButtonBySymbol(dialog, tokenExpectation.symbol);
  await act(async () => {
    fireEvent.click(tokenRowButton);
  });

  await waitFor(
    () => {
      expect(screen.queryByRole('dialog')).toBeNull();
    },
    {
      timeout: INTEGRATION_ASSERT_TIMEOUT_MS,
      onTimeout: withoutTestingLibraryDom,
    },
  );
}

export async function setSourceToken(tokenExpectation: TokenExpectation) {
  await selectTokenPanelToken({
    isDestination: false,
    tokenExpectation,
  });
}

export async function setDestinationToken(tokenExpectation: TokenExpectation) {
  await selectTokenPanelToken({
    isDestination: true,
    tokenExpectation,
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
