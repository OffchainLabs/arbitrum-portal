import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { TokenType } from '../../hooks/arbTokenBridge.types';
import { useAppStore } from '../../state';
import { ChainId } from '../../types/ChainId';
import { LIFI_TRANSFER_LIST_ID, type TokenListWithId } from '../../util/TokenListUtils';
import { useTokenImportDialogStore } from './TokenImportDialog';
import {
  expectTokenButtonContent,
  renderTransferPanel,
  setSourceToken,
  setupTransferPanelLifiIntegrationSuite,
} from './TransferPanel.integration.helpers';

const ROBINHOOD_ONLY_TOKEN_ADDRESS = '0x1111111111111111111111111111111111111111';
const ROBINHOOD_ONLY_IMPORTED_TOKEN_ADDRESS = '0x2222222222222222222222222222222222222222';
const ROBINHOOD_BWLK_ADDRESS = '0x523fc1c7649155d8f8a13ed860ead39af1a3019c';
const ETHEREUM_BWLK_ADDRESS = '0xf9a352b7c7b62a852e5c8a64a455246dd9596461';
const ROBINHOOD_ENA_ADDRESS = '0x58538e6a46e07434d7e7375bc268d3cb839c0133';
const ARBITRUM_ENA_ADDRESSES = [
  '0x58538e6a46e07434d7e7375bc268d3cb839c0133',
  '0xdf8f0c63d9335a0abd89f9f752d293a98ea977d8',
] as const;

const mockedTokenLists = vi.hoisted(() => ({
  current: [] as TokenListWithId[],
}));
const standaloneValidationChainIds = vi.hoisted(() => [] as number[]);

// Keep TokenListSyncer initialization without merging live lists into this suite's mocked data.
vi.mock('../../util/TokenListUtils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../util/TokenListUtils')>();

  return {
    ...actual,
    addBridgeTokenListToBridge: (...args: Parameters<typeof actual.addBridgeTokenListToBridge>) => {
      const [bridgeTokenList, arbTokenBridge] = args;
      arbTokenBridge.token.addTokensFromList(
        {
          name: 'Test tokens',
          timestamp: '2026-07-27T00:00:00.000Z',
          version: { major: 1, minor: 0, patch: 0 },
          tokens: [],
        },
        bridgeTokenList.id,
      );
    },
  };
});

vi.mock('../../hooks/useTokenLists', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../hooks/useTokenLists')>();

  return {
    ...actual,
    useTokenLists: (...args: Parameters<typeof actual.useTokenLists>) => ({
      ...actual.useTokenLists(...args),
      data: mockedTokenLists.current,
      isLoading: false,
      isValidating: false,
    }),
  };
});

vi.mock('../../util/TokenUtils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../util/TokenUtils')>();

  return {
    ...actual,
    getL1ERC20Address: async (...args: Parameters<typeof actual.getL1ERC20Address>) => {
      const [{ erc20L2Address }] = args;
      if (erc20L2Address.toLowerCase() === ROBINHOOD_BWLK_ADDRESS) {
        return ETHEREUM_BWLK_ADDRESS;
      }
      if (
        [ROBINHOOD_ONLY_IMPORTED_TOKEN_ADDRESS, ETHEREUM_BWLK_ADDRESS].includes(
          erc20L2Address.toLowerCase(),
        )
      ) {
        return null;
      }

      return actual.getL1ERC20Address(...args);
    },
    getL2ERC20Address: async (...args: Parameters<typeof actual.getL2ERC20Address>) => {
      const [{ erc20L1Address }] = args;
      if (erc20L1Address.toLowerCase() === ETHEREUM_BWLK_ADDRESS) {
        return ROBINHOOD_BWLK_ADDRESS;
      }
      if (erc20L1Address.toLowerCase() === ROBINHOOD_ONLY_IMPORTED_TOKEN_ADDRESS) {
        return ROBINHOOD_ONLY_IMPORTED_TOKEN_ADDRESS;
      }

      return actual.getL2ERC20Address(...args);
    },
    isValidErc20: async (...args: Parameters<typeof actual.isValidErc20>) => {
      const [{ address, provider }] = args;
      if (address.toLowerCase() === ROBINHOOD_ONLY_IMPORTED_TOKEN_ADDRESS) {
        const chainId = (await provider.getNetwork()).chainId;
        standaloneValidationChainIds.push(chainId);
        return chainId === ChainId.RobinhoodChain;
      }
      if (address.toLowerCase() === ETHEREUM_BWLK_ADDRESS) {
        return (await provider.getNetwork()).chainId === ChainId.Ethereum;
      }

      return actual.isValidErc20(...args);
    },
    fetchErc20Data: async (...args: Parameters<typeof actual.fetchErc20Data>) => {
      const [{ address, provider }] = args;
      if (address.toLowerCase() === ROBINHOOD_ONLY_IMPORTED_TOKEN_ADDRESS) {
        if ((await provider.getNetwork()).chainId !== ChainId.RobinhoodChain) {
          throw new Error('Robinhood token queried on the wrong chain');
        }

        return {
          name: 'Robinhood imported token',
          symbol: 'RHI',
          address: ROBINHOOD_ONLY_IMPORTED_TOKEN_ADDRESS,
          decimals: 18,
        };
      }
      if (address.toLowerCase() === ETHEREUM_BWLK_ADDRESS) {
        if ((await provider.getNetwork()).chainId !== ChainId.Ethereum) {
          throw new Error('Canonical token queried on the wrong chain');
        }

        return {
          name: 'Boardwalk',
          symbol: 'BWLK',
          address: ETHEREUM_BWLK_ADDRESS,
          decimals: 18,
        };
      }

      return actual.fetchErc20Data(...args);
    },
    l1TokenIsDisabled: async (...args: Parameters<typeof actual.l1TokenIsDisabled>) => {
      const [{ erc20L1Address }] = args;
      if (erc20L1Address.toLowerCase() === ETHEREUM_BWLK_ADDRESS) {
        return false;
      }

      return actual.l1TokenIsDisabled(...args);
    },
  };
});

function robinhoodOnlyTokenList(): TokenListWithId {
  return {
    bridgeTokenListId: LIFI_TRANSFER_LIST_ID,
    l2ChainId: String(ChainId.RobinhoodChain),
    name: 'LiFi tokens',
    tokens: [
      {
        address: ROBINHOOD_ONLY_TOKEN_ADDRESS,
        chainId: ChainId.RobinhoodChain,
        decimals: 18,
        name: 'Robinhood-only token',
        symbol: 'RHO',
      },
    ],
    timestamp: '2026-07-27T00:00:00.000Z',
    version: { major: 1, minor: 0, patch: 0 },
  };
}

function robinhoodEnaTokenList(): TokenListWithId {
  return {
    bridgeTokenListId: LIFI_TRANSFER_LIST_ID,
    l2ChainId: String(ChainId.RobinhoodChain),
    name: 'LiFi tokens',
    tokens: ARBITRUM_ENA_ADDRESSES.map((arbitrumAddress) => ({
      address: ROBINHOOD_ENA_ADDRESS,
      chainId: ChainId.RobinhoodChain,
      decimals: 18,
      name: 'ENA',
      symbol: 'ENA',
      extensions: {
        bridgeInfo: {
          [ChainId.ArbitrumOne]: {
            tokenAddress: arbitrumAddress,
          },
        },
      },
    })),
    timestamp: '2026-07-27T00:00:00.000Z',
    version: { major: 1, minor: 0, patch: 0 },
  };
}

describe.sequential('TransferPanel Robinhood token import integration', () => {
  setupTransferPanelLifiIntegrationSuite();

  afterEach(() => {
    mockedTokenLists.current = [];
    standaloneValidationChainIds.length = 0;
    useTokenImportDialogStore.setState({ isOpen: false });
  });

  it('selects a Robinhood-only LiFi token as the source token', async () => {
    mockedTokenLists.current = [robinhoodOnlyTokenList()];

    await renderTransferPanel({
      sourceChain: 'robinhood-chain',
      destinationChain: 'ethereum',
    });

    await act(async () => {
      const { arbTokenBridge } = useAppStore.getState();
      useAppStore.setState({
        arbTokenBridge: {
          ...arbTokenBridge,
          bridgeTokens: {
            ...arbTokenBridge.bridgeTokens,
            [ROBINHOOD_ONLY_TOKEN_ADDRESS]: {
              type: TokenType.ERC20,
              name: 'Robinhood-only token',
              symbol: 'RHO',
              address: ROBINHOOD_ONLY_TOKEN_ADDRESS,
              l2Address: ROBINHOOD_ONLY_TOKEN_ADDRESS,
              decimals: 18,
              lifiOnlyChainId: ChainId.RobinhoodChain,
              listIds: new Set([LIFI_TRANSFER_LIST_ID]),
            },
          },
        },
      });
    });

    await setSourceToken({
      symbol: 'RHO',
      contract: ROBINHOOD_ONLY_TOKEN_ADDRESS,
    });

    await expectTokenButtonContent({
      isDestination: false,
      tokenExpectation: { symbol: 'RHO' },
    });
    expect(
      within(
        screen.getByRole('button', {
          name: 'Select Destination Token',
          hidden: true,
        }),
      ).queryByText('RHO'),
    ).toBeNull();
  });

  it('shows the distinct Arbitrum contract for each ENA destination token', async () => {
    mockedTokenLists.current = [robinhoodEnaTokenList()];

    await renderTransferPanel({
      sourceChain: 'robinhood-chain',
      destinationChain: 'arbitrum-one',
    });

    const destinationTokenButton = await screen.findByRole('button', {
      name: 'Select Destination Token',
      hidden: true,
    });
    await act(async () => {
      fireEvent.click(destinationTokenButton);
    });

    const dialog = await screen.findByRole('dialog');
    await waitFor(() => {
      const contractLinks = Array.from(dialog.querySelectorAll('a[href]')).map(
        (link) => link.getAttribute('href')?.toLowerCase() ?? '',
      );

      for (const arbitrumAddress of ARBITRUM_ENA_ADDRESSES) {
        expect(contractLinks.some((href) => href.includes(`/token/${arbitrumAddress}`))).toBe(true);
      }
    });
  });

  it('shows the shared Robinhood ENA contract only once in source search', async () => {
    mockedTokenLists.current = [robinhoodEnaTokenList()];

    await renderTransferPanel({
      sourceChain: 'robinhood-chain',
      destinationChain: 'arbitrum-one',
    });

    const sourceTokenButton = await screen.findByRole('button', {
      name: 'Select Token',
      hidden: true,
    });
    await act(async () => {
      fireEvent.click(sourceTokenButton);
    });

    const dialog = await screen.findByRole('dialog');
    await act(async () => {
      fireEvent.change(
        within(dialog).getByPlaceholderText('Search by token name, symbol, or address'),
        { target: { value: 'ENA' } },
      );
    });

    await waitFor(() => {
      const robinhoodContractLinks = Array.from(dialog.querySelectorAll('a[href]')).filter((link) =>
        link.getAttribute('href')?.toLowerCase().includes(`/token/${ROBINHOOD_ENA_ADDRESS}`),
      );

      expect(robinhoodContractLinks).toHaveLength(1);
    });
  });

  it('allows importing a token from Robinhood source search', async () => {
    await renderTransferPanel({
      sourceChain: 'robinhood-chain',
      destinationChain: 'ethereum',
    });

    const selectTokenButton = await screen.findByRole('button', {
      name: 'Select Token',
      hidden: true,
    });
    await act(async () => {
      fireEvent.click(selectTokenButton);
    });

    const dialog = await screen.findByRole('dialog');
    const searchInput = within(dialog).getByPlaceholderText(
      'Search by token name, symbol, or address',
    );
    await act(async () => {
      fireEvent.change(searchInput, {
        target: { value: ROBINHOOD_ONLY_IMPORTED_TOKEN_ADDRESS },
      });
      fireEvent.click(within(dialog).getByRole('button', { name: 'Add New Token' }));
    });

    await within(dialog).findByText('RHI');
    expect(within(dialog).queryByText('Token not found on this network.')).toBeNull();
    expect(
      useAppStore.getState().arbTokenBridge.bridgeTokens?.[ROBINHOOD_ONLY_IMPORTED_TOKEN_ADDRESS],
    ).toMatchObject({
      address: ROBINHOOD_ONLY_IMPORTED_TOKEN_ADDRESS,
      l2Address: ROBINHOOD_ONLY_IMPORTED_TOKEN_ADDRESS,
      lifiOnlyChainId: ChainId.RobinhoodChain,
    });
  });

  it('imports a canonical Robinhood token from source search with its Ethereum parent', async () => {
    await renderTransferPanel({
      sourceChain: 'robinhood-chain',
      destinationChain: 'ethereum',
    });

    const selectTokenButton = await screen.findByRole('button', {
      name: 'Select Token',
      hidden: true,
    });
    await act(async () => {
      fireEvent.click(selectTokenButton);
    });

    const dialog = await screen.findByRole('dialog');
    const searchInput = within(dialog).getByPlaceholderText(
      'Search by token name, symbol, or address',
    );
    await act(async () => {
      fireEvent.change(searchInput, {
        target: { value: ROBINHOOD_BWLK_ADDRESS },
      });
      fireEvent.click(within(dialog).getByRole('button', { name: 'Add New Token' }));
    });

    await within(dialog).findByText('BWLK');
    const canonicalToken =
      useAppStore.getState().arbTokenBridge.bridgeTokens?.[ETHEREUM_BWLK_ADDRESS];
    expect(canonicalToken).toMatchObject({
      address: ETHEREUM_BWLK_ADDRESS,
      l2Address: ROBINHOOD_BWLK_ADDRESS,
    });
    expect(canonicalToken?.lifiOnlyChainId).toBeUndefined();
  });

  it('imports and selects a Robinhood-only token from a URL', async () => {
    standaloneValidationChainIds.length = 0;

    await renderTransferPanel({
      sourceChain: 'robinhood-chain',
      destinationChain: 'ethereum',
      token: ROBINHOOD_ONLY_IMPORTED_TOKEN_ADDRESS,
    });

    const dialog = await screen.findByRole('dialog', {
      name: 'Import unknown token',
    });
    expect(standaloneValidationChainIds).toContain(ChainId.RobinhoodChain);
    expect(standaloneValidationChainIds).not.toContain(ChainId.Ethereum);
    await act(async () => {
      fireEvent.click(within(dialog).getByRole('button', { name: 'Import token' }));
    });

    await expectTokenButtonContent({
      isDestination: false,
      tokenExpectation: { symbol: 'RHI' },
    });
    expect(
      within(
        screen.getByRole('button', {
          name: 'Select Destination Token',
          hidden: true,
        }),
      ).queryByText('RHI'),
    ).toBeNull();
  });

  it('imports and selects canonical BWLK from a URL with its Ethereum parent', async () => {
    await renderTransferPanel({
      sourceChain: 'robinhood-chain',
      destinationChain: 'ethereum',
      token: ROBINHOOD_BWLK_ADDRESS,
    });

    const dialog = await screen.findByRole('dialog', {
      name: 'Import unknown token',
    });
    await act(async () => {
      fireEvent.click(within(dialog).getByRole('button', { name: 'Import token' }));
    });

    await expectTokenButtonContent({
      isDestination: false,
      tokenExpectation: { symbol: 'BWLK' },
    });
    const canonicalToken =
      useAppStore.getState().arbTokenBridge.bridgeTokens?.[ETHEREUM_BWLK_ADDRESS];
    expect(canonicalToken).toMatchObject({
      address: ETHEREUM_BWLK_ADDRESS,
      l2Address: ROBINHOOD_BWLK_ADDRESS,
    });
    expect(canonicalToken?.lifiOnlyChainId).toBeUndefined();
  });

  it('preserves canonical import when the URL contains the Ethereum parent address', async () => {
    await renderTransferPanel({
      sourceChain: 'robinhood-chain',
      destinationChain: 'ethereum',
      token: ETHEREUM_BWLK_ADDRESS,
    });

    const dialog = await screen.findByRole('dialog', {
      name: 'Import unknown token',
    });
    await act(async () => {
      fireEvent.click(within(dialog).getByRole('button', { name: 'Import token' }));
    });

    await expectTokenButtonContent({
      isDestination: false,
      tokenExpectation: { symbol: 'BWLK' },
    });
    expect(
      useAppStore.getState().arbTokenBridge.bridgeTokens?.[ETHEREUM_BWLK_ADDRESS],
    ).toMatchObject({
      address: ETHEREUM_BWLK_ADDRESS,
      l2Address: ROBINHOOD_BWLK_ADDRESS,
    });
  });
});
