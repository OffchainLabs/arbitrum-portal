import { afterEach, describe, it, vi } from 'vitest';

import { type ArbTokenBridge, TokenType } from '../../hooks/arbTokenBridge.types';
import { CommonAddress } from '../../util/CommonAddressUtils';
import {
  type ChainQuerySlug,
  type TokenExpectation,
  ethTokenExpectation,
  expectDialogToStayClosed,
  expectTokenButtonContent,
  nativeEthTokenExpectation,
  renderTransferPanel,
  setSourceToken,
  setupTransferPanelLifiIntegrationSuite,
  tokenExpectationsByChain,
  wethTokenExpectation,
} from './TransferPanel.integration.helpers';

const mockedArbTokenBridge = vi.hoisted(() => ({
  current: undefined as ArbTokenBridge | undefined,
}));
const mockedTokenLists = vi.hoisted(() => ({
  unresolved: false,
}));
const mockedOftBlock = vi.hoisted(() => ({
  enabled: false,
}));

vi.mock('../../hooks/useArbTokenBridge', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../hooks/useArbTokenBridge')>();

  return {
    ...actual,
    useArbTokenBridge: (...args: Parameters<typeof actual.useArbTokenBridge>) => {
      const arbTokenBridge = actual.useArbTokenBridge(...args);
      return mockedArbTokenBridge.current ?? arbTokenBridge;
    },
  };
});

vi.mock('../../hooks/useTokenLists', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../hooks/useTokenLists')>();

  return {
    ...actual,
    useTokenLists: (...args: Parameters<typeof actual.useTokenLists>) => {
      const tokenLists = actual.useTokenLists(...args);

      return mockedTokenLists.unresolved
        ? { ...tokenLists, data: undefined, isValidating: false }
        : tokenLists;
    },
  };
});

vi.mock('../../util/WithdrawOnlyUtils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../util/WithdrawOnlyUtils')>();

  return {
    ...actual,
    isBlockedOftDeposit: (...args: Parameters<typeof actual.isBlockedOftDeposit>) =>
      mockedOftBlock.enabled ? Promise.resolve(true) : actual.isBlockedOftDeposit(...args),
  };
});

type EthWethSelectionCase = {
  sourceChain: ChainQuerySlug;
  destinationChain: ChainQuerySlug;
  selectedSourceToken: TokenExpectation;
  sourceToken: TokenExpectation;
  destinationToken: TokenExpectation;
};

const ethWethCases: EthWethSelectionCase[] = [
  {
    sourceChain: 'ethereum',
    destinationChain: 'superposition',
    selectedSourceToken: ethTokenExpectation,
    sourceToken: ethTokenExpectation,
    destinationToken: ethTokenExpectation,
  },
  {
    sourceChain: 'superposition',
    destinationChain: 'ethereum',
    selectedSourceToken: ethTokenExpectation,
    sourceToken: ethTokenExpectation,
    destinationToken: ethTokenExpectation,
  },
  {
    sourceChain: 'apechain',
    destinationChain: 'superposition',
    selectedSourceToken: wethTokenExpectation,
    sourceToken: wethTokenExpectation,
    destinationToken: wethTokenExpectation,
  },
  {
    sourceChain: 'ethereum',
    destinationChain: 'apechain',
    selectedSourceToken: ethTokenExpectation,
    sourceToken: ethTokenExpectation,
    destinationToken: wethTokenExpectation,
  },
  {
    sourceChain: 'apechain',
    destinationChain: 'ethereum',
    selectedSourceToken: wethTokenExpectation,
    sourceToken: wethTokenExpectation,
    destinationToken: wethTokenExpectation,
  },
  {
    sourceChain: 'superposition',
    destinationChain: 'apechain',
    selectedSourceToken: nativeEthTokenExpectation,
    sourceToken: nativeEthTokenExpectation,
    destinationToken: wethTokenExpectation,
  },
  {
    sourceChain: 'ethereum',
    destinationChain: 'robinhood-chain',
    selectedSourceToken: tokenExpectationsByChain.Ethereum.WETHWithRobinhoodLogo,
    sourceToken: tokenExpectationsByChain.RobinhoodChain.WETH,
    destinationToken: tokenExpectationsByChain.RobinhoodChain.WETH,
  },
  {
    sourceChain: 'robinhood-chain',
    destinationChain: 'ethereum',
    selectedSourceToken: tokenExpectationsByChain.RobinhoodChain.WETH,
    sourceToken: tokenExpectationsByChain.RobinhoodChain.WETH,
    destinationToken: tokenExpectationsByChain.RobinhoodChain.WETH,
  },
  {
    sourceChain: 'arbitrum-one',
    destinationChain: 'robinhood-chain',
    selectedSourceToken: tokenExpectationsByChain.ArbitrumOne.WETHWithRobinhoodLogo,
    sourceToken: tokenExpectationsByChain.RobinhoodChain.WETH,
    destinationToken: tokenExpectationsByChain.RobinhoodChain.WETH,
  },
  {
    sourceChain: 'robinhood-chain',
    destinationChain: 'arbitrum-one',
    selectedSourceToken: tokenExpectationsByChain.RobinhoodChain.WETH,
    sourceToken: tokenExpectationsByChain.RobinhoodChain.WETH,
    destinationToken: tokenExpectationsByChain.RobinhoodChain.WETH,
  },
  {
    sourceChain: 'superposition',
    destinationChain: 'robinhood-chain',
    selectedSourceToken: tokenExpectationsByChain.Superposition.WETHWithSuperpositionLogo,
    sourceToken: tokenExpectationsByChain.Superposition.WETHWithSuperpositionLogo,
    destinationToken: tokenExpectationsByChain.Superposition.WETHWithSuperpositionLogo,
  },
  {
    sourceChain: 'robinhood-chain',
    destinationChain: 'superposition',
    selectedSourceToken: tokenExpectationsByChain.RobinhoodChain.WETHWithSuperpositionLogo,
    sourceToken: tokenExpectationsByChain.RobinhoodChain.WETHWithSuperpositionLogo,
    destinationToken: tokenExpectationsByChain.RobinhoodChain.WETHWithSuperpositionLogo,
  },
];

const cachedArbitrumWethBridge = {
  bridgeTokens: {
    [CommonAddress.ArbitrumOne.WETH]: {
      address: CommonAddress.ArbitrumOne.WETH,
      decimals: 18,
      listIds: new Set<string>(),
      name: 'Wrapped Ether',
      symbol: 'WETH',
      type: TokenType.ERC20,
    },
  },
  eth: {
    triggerOutbox: async () => undefined,
  },
  token: {
    add: async () => undefined,
    addL2NativeToken: () => undefined,
    addTokensFromList: () => undefined,
    removeTokensFromList: () => undefined,
    triggerOutbox: async () => undefined,
    updateTokenData: async () => undefined,
  },
} satisfies ArbTokenBridge;

async function assertEthWethSelection({
  sourceChain,
  destinationChain,
  selectedSourceToken,
  sourceToken,
  destinationToken,
}: EthWethSelectionCase) {
  await renderTransferPanel({
    sourceChain,
    destinationChain,
  });

  await setSourceToken(selectedSourceToken);

  await expectTokenButtonContent({
    isDestination: false,
    tokenExpectation: sourceToken,
  });
  await expectTokenButtonContent({
    isDestination: true,
    tokenExpectation: destinationToken,
  });
}

describe.sequential('TransferPanel LiFi Integration - ETH/WETH Override', () => {
  setupTransferPanelLifiIntegrationSuite();

  afterEach(() => {
    mockedArbTokenBridge.current = undefined;
    mockedOftBlock.enabled = false;
    mockedTokenLists.unresolved = false;
  });

  it.each(ethWethCases)(
    'renders expected source and destination tokens for ETH/WETH override: $sourceChain -> $destinationChain',
    assertEthWethSelection,
  );

  it('does not show the disabled-transfer dialog while LiFi token lists are unresolved', async () => {
    mockedArbTokenBridge.current = cachedArbitrumWethBridge;
    mockedOftBlock.enabled = true;
    mockedTokenLists.unresolved = true;

    await renderTransferPanel({
      sourceChain: 'arbitrum-one',
      destinationChain: 'robinhood-chain',
      token: CommonAddress.ArbitrumOne.WETH,
      destinationToken: CommonAddress.ArbitrumOne.WETH,
    });

    await expectDialogToStayClosed({
      name: 'Token cannot be bridged here',
    });
  });
});
