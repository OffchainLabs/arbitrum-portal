import { describe, expect, it } from 'vitest';

import { RegistryChainFile, TopFile } from '../registryFiles';
import {
  buildDestinationOptions,
  searchChainFiles,
  withImportedTokens,
} from '../server/registryFiles';
import { NATIVE_TOKEN_ADDRESS, Token, toTokenId } from '../types';

const USDC_ETHEREUM = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';
const USDC_ARBITRUM = '0xaf88d065e77c8cc2239327c5edb3a432268e5831';
const USDC_E_ARBITRUM = '0xff970a61a04b1ca14834a43f5de4533ebddb5cc8';
const USDCX_ETHEREUM = '0x00000000000000000000000000000000000000e1';
const WBTC_ARBITRUM = '0x2f2a2543b76a4166549f7aab2e75bef0aefc5b0f';

const ethereum: RegistryChainFile = {
  generatedAt: '',
  chainId: 1,
  tokens: [
    { address: NATIVE_TOKEN_ADDRESS, symbol: 'ETH', name: 'Ether', decimals: 18 },
    {
      address: USDC_ETHEREUM,
      symbol: 'USDC',
      name: 'USD Coin',
      decimals: 6,
      counterparts: { '42161': USDC_ARBITRUM },
    },
    { address: USDCX_ETHEREUM, symbol: 'USDCX', name: 'Wrapped thing', decimals: 6 },
  ],
};

const arbitrumOne: RegistryChainFile = {
  generatedAt: '',
  chainId: 42161,
  parentChainId: 1,
  tokens: [
    { address: NATIVE_TOKEN_ADDRESS, symbol: 'ETH', name: 'Ether', decimals: 18 },
    { address: USDC_ARBITRUM, symbol: 'USDC', name: 'USD Coin', decimals: 6 },
    {
      address: USDC_E_ARBITRUM,
      symbol: 'USDC.e',
      name: 'Bridged USDC',
      decimals: 6,
      parentAddress: USDC_ETHEREUM,
    },
    { address: WBTC_ARBITRUM, symbol: 'WBTC', name: 'Wrapped BTC', decimals: 8 },
  ],
};

const top: TopFile = {
  generatedAt: '',
  tokens: [
    {
      chainId: 42161,
      address: USDC_ARBITRUM,
      symbol: 'USDC',
      name: 'USD Coin',
      decimals: 6,
      volumeUSD24H: 90,
    },
    {
      chainId: 1,
      address: USDC_ETHEREUM,
      symbol: 'USDC',
      name: 'USD Coin',
      decimals: 6,
      volumeUSD24H: 800,
    },
    {
      chainId: 42161,
      address: WBTC_ARBITRUM,
      symbol: 'WBTC',
      name: 'Wrapped BTC',
      decimals: 8,
      volumeUSD24H: 30,
    },
  ],
};

type LifiTokens = { fromTokens: string[]; toTokens: string[] };

// The files flag the tokens LiFi routes, and the index the pairs it connects.
function withLifi({
  sourceFile,
  destinationFile,
  lifi,
}: {
  sourceFile: RegistryChainFile;
  destinationFile: RegistryChainFile;
  lifi?: LifiTokens;
}) {
  const flag = (file: RegistryChainFile, addresses: string[]): RegistryChainFile => ({
    ...file,
    tokens: file.tokens.map((token) =>
      addresses.includes(token.address) ? { ...token, isLifi: true } : token,
    ),
  });
  return {
    sourceFile: flag(sourceFile, lifi?.fromTokens ?? []),
    destinationFile: flag(destinationFile, lifi?.toTokens ?? []),
    hasLifi: lifi !== undefined,
  };
}

const depositLifi: LifiTokens = {
  fromTokens: [NATIVE_TOKEN_ADDRESS, USDC_ETHEREUM],
  toTokens: [NATIVE_TOKEN_ADDRESS, USDC_ARBITRUM, WBTC_ARBITRUM],
};

const keys = (tokens: { chainId: number; address: string }[]) =>
  tokens.map((token) => `${token.chainId}:${token.address}`);

describe('searchChainFiles', () => {
  it('ranks exact symbols, then prefixes, then names, then volume', () => {
    expect(
      keys(searchChainFiles({ chainFiles: [ethereum, arbitrumOne], top, query: 'usdc' })),
    ).toEqual([
      `1:${USDC_ETHEREUM}`,
      `42161:${USDC_ARBITRUM}`,
      `42161:${USDC_E_ARBITRUM}`,
      `1:${USDCX_ETHEREUM}`,
    ]);
    expect(
      keys(searchChainFiles({ chainFiles: [ethereum, arbitrumOne], top, query: 'wrapped' })),
    ).toEqual([`42161:${WBTC_ARBITRUM}`, `1:${USDCX_ETHEREUM}`]);
  });

  it('finds tokens outside the top list, and matches an address exactly', () => {
    const [usdcE] = searchChainFiles({
      chainFiles: [ethereum, arbitrumOne],
      top,
      query: USDC_E_ARBITRUM.toUpperCase().replace('0X', '0x'),
    });
    expect(usdcE).toMatchObject({ chainId: 42161, address: USDC_E_ARBITRUM });
    expect(usdcE?.volumeUSD24H).toBeUndefined();
  });

  it('stops at the limit', () => {
    expect(
      searchChainFiles({ chainFiles: [ethereum, arbitrumOne], top, query: 'usdc', limit: 2 }),
    ).toHaveLength(2);
  });
});

describe('buildDestinationOptions', () => {
  it('puts the canonical token first, then the same token, then LiFi tokens by volume', () => {
    const { options, defaultToken, canonicalToken } = buildDestinationOptions({
      ...withLifi({ sourceFile: ethereum, destinationFile: arbitrumOne, lifi: depositLifi }),
      top,
      sourceTokenAddress: USDC_ETHEREUM,
      layerZeroMetadata: null,
    });
    expect(options.map((option) => [option.address, option.providers])).toEqual([
      [USDC_E_ARBITRUM, ['canonical']],
      [USDC_ARBITRUM, ['lifi']],
      [WBTC_ARBITRUM, ['lifi']],
      [NATIVE_TOKEN_ADDRESS, ['lifi']],
    ]);
    expect(defaultToken?.address).toBe(USDC_ARBITRUM);
    expect(canonicalToken?.address).toBe(USDC_E_ARBITRUM);
  });

  it('ignores the LiFi flags on a pair that LiFi does not connect', () => {
    const { options } = buildDestinationOptions({
      ...withLifi({ sourceFile: ethereum, destinationFile: arbitrumOne, lifi: depositLifi }),
      hasLifi: false,
      top,
      sourceTokenAddress: USDC_ETHEREUM,
      layerZeroMetadata: null,
    });
    expect(options.map((option) => [option.address, option.providers])).toEqual([
      [USDC_E_ARBITRUM, ['canonical']],
    ]);
  });

  it('withdraws to the parent token and sends Ether to Ether', () => {
    const build = (sourceTokenAddress: string) =>
      buildDestinationOptions({
        sourceFile: arbitrumOne,
        destinationFile: ethereum,
        hasLifi: false,
        top,
        sourceTokenAddress,
        layerZeroMetadata: null,
      }).options;
    expect(build(USDC_E_ARBITRUM).map((option) => option.address)).toEqual([USDC_ETHEREUM]);
    expect(build(NATIVE_TOKEN_ADDRESS)).toMatchObject([
      { address: NATIVE_TOKEN_ADDRESS, providers: ['canonical'] },
    ]);
    expect(build(WBTC_ARBITRUM)).toEqual([]);
  });
});

describe('buildDestinationOptions policy', () => {
  const USDC_ROBINHOOD = '0x80e0e24718dbfcad49ecaa6f1e6c89a190586ca8';
  const USDT_ETHEREUM = '0xdac17f958d2ee523a2206206994597c13d831ec7';
  const USDT0_ARBITRUM = '0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9';
  const PYUSD_ETHEREUM = '0x6c3ea9036406852006290770bedfcaba0e23a0e8';
  const PYUSD_CANONICAL_ARBITRUM = '0x327006c8712fe0abdbbd55b7999db39b0967342e';
  const PYUSD_ARBITRUM = '0x46850ad61c2b7d64d08c9c754f45254596696984';
  const APE_ARBITRUM = '0x7f9fbf9bdd3f4105c478b996b648fe6e828a1e98';

  const token = (address: string, symbol: string, parentAddress?: string) => ({
    address,
    symbol,
    name: symbol,
    decimals: 6,
    ...(parentAddress ? { parentAddress } : {}),
  });
  const chainFile = (
    chainId: number,
    parentChainId: number | undefined,
    tokens: RegistryChainFile['tokens'],
  ): RegistryChainFile => ({
    generatedAt: '',
    chainId,
    ...(parentChainId === undefined ? {} : { parentChainId }),
    tokens,
  });
  const build = ({
    sourceFile,
    destinationFile,
    lifi,
    sourceTokenAddress,
  }: {
    sourceFile: RegistryChainFile;
    destinationFile: RegistryChainFile;
    lifi?: LifiTokens;
    sourceTokenAddress: string;
  }) =>
    buildDestinationOptions({
      ...withLifi({ sourceFile, destinationFile, lifi }),
      top,
      sourceTokenAddress,
      layerZeroMetadata: null,
    });

  const ethereumTokens = chainFile(1, undefined, [
    token(NATIVE_TOKEN_ADDRESS, 'ETH'),
    token(USDC_ETHEREUM, 'USDC'),
    token(USDT_ETHEREUM, 'USDT'),
    token(PYUSD_ETHEREUM, 'PYUSD'),
  ]);
  const robinhood = chainFile(4663, 1, [
    token(NATIVE_TOKEN_ADDRESS, 'ETH'),
    token(USDC_ROBINHOOD, 'USDC', USDC_ETHEREUM),
  ]);

  it('drops a source token that the pair blocks', () => {
    expect(
      build({
        sourceFile: ethereumTokens,
        destinationFile: robinhood,
        lifi: { fromTokens: [USDC_ETHEREUM], toTokens: [USDC_ROBINHOOD] },
        sourceTokenAddress: USDC_ETHEREUM,
      }).options,
    ).toEqual([]);
  });

  it('drops the LiFi routes that the pair blocks, and keeps the canonical one', () => {
    const { options } = build({
      sourceFile: robinhood,
      destinationFile: ethereumTokens,
      lifi: { fromTokens: [USDC_ROBINHOOD], toTokens: [USDC_ETHEREUM, NATIVE_TOKEN_ADDRESS] },
      sourceTokenAddress: USDC_ROBINHOOD,
    });
    expect(options.map((option) => [option.address, option.providers])).toEqual([
      [USDC_ETHEREUM, ['canonical']],
    ]);
  });

  it('adds the LayerZero route', () => {
    const { options, defaultToken } = build({
      sourceFile: ethereumTokens,
      destinationFile: chainFile(42161, 1, [
        token(NATIVE_TOKEN_ADDRESS, 'ETH'),
        token(USDT0_ARBITRUM, 'USDT0'),
      ]),
      lifi: { fromTokens: [USDT_ETHEREUM], toTokens: [NATIVE_TOKEN_ADDRESS, USDT0_ARBITRUM] },
      sourceTokenAddress: USDT_ETHEREUM,
    });
    expect(options.map((option) => [option.address, option.providers])).toEqual([
      [USDT0_ARBITRUM, ['layerzero', 'lifi']],
      [NATIVE_TOKEN_ADDRESS, ['lifi']],
    ]);
    expect(defaultToken?.address).toBe(USDT0_ARBITRUM);
  });

  it("defaults to the pair's override, and keeps the canonical token first", () => {
    const { options, defaultToken } = build({
      sourceFile: ethereumTokens,
      destinationFile: chainFile(42161, 1, [
        token(PYUSD_CANONICAL_ARBITRUM, 'PYUSD', PYUSD_ETHEREUM),
        token(PYUSD_ARBITRUM, 'PYUSD'),
      ]),
      lifi: { fromTokens: [PYUSD_ETHEREUM], toTokens: [PYUSD_ARBITRUM] },
      sourceTokenAddress: PYUSD_ETHEREUM,
    });
    expect(options.map((option) => option.address)).toEqual([
      PYUSD_CANONICAL_ARBITRUM,
      PYUSD_ARBITRUM,
    ]);
    expect(defaultToken?.address).toBe(PYUSD_ARBITRUM);
  });

  it('defaults to the picked token over the override', () => {
    const { defaultToken } = buildDestinationOptions({
      ...withLifi({
        sourceFile: ethereumTokens,
        destinationFile: chainFile(42161, 1, [
          token(PYUSD_CANONICAL_ARBITRUM, 'PYUSD', PYUSD_ETHEREUM),
          token(PYUSD_ARBITRUM, 'PYUSD'),
        ]),
        lifi: { fromTokens: [PYUSD_ETHEREUM], toTokens: [PYUSD_ARBITRUM] },
      }),
      top,
      sourceTokenAddress: PYUSD_ETHEREUM,
      preferredAddress: PYUSD_CANONICAL_ARBITRUM,
      layerZeroMetadata: null,
    });
    expect(defaultToken?.address).toBe(PYUSD_CANONICAL_ARBITRUM);
  });

  it('ignores a picked token that the source cannot reach', () => {
    const { defaultToken } = buildDestinationOptions({
      ...withLifi({
        sourceFile: ethereumTokens,
        destinationFile: chainFile(42161, 1, [token(PYUSD_ARBITRUM, 'PYUSD')]),
        lifi: { fromTokens: [PYUSD_ETHEREUM], toTokens: [PYUSD_ARBITRUM] },
      }),
      top,
      sourceTokenAddress: PYUSD_ETHEREUM,
      preferredAddress: USDT0_ARBITRUM,
      layerZeroMetadata: null,
    });
    expect(defaultToken?.address).toBe(PYUSD_ARBITRUM);
  });

  it('sends the gas token, not Ether, to the native token of a custom gas token chain', () => {
    const arbitrum = chainFile(42161, 1, [
      token(NATIVE_TOKEN_ADDRESS, 'ETH'),
      token(APE_ARBITRUM, 'APE'),
    ]);
    const apeChain = chainFile(33139, 42161, [token(NATIVE_TOKEN_ADDRESS, 'APE', APE_ARBITRUM)]);
    const deposit = (sourceTokenAddress: string) =>
      build({ sourceFile: arbitrum, destinationFile: apeChain, sourceTokenAddress }).options;

    expect(deposit(APE_ARBITRUM).map((option) => option.address)).toEqual([NATIVE_TOKEN_ADDRESS]);
    expect(deposit(NATIVE_TOKEN_ADDRESS)).toEqual([]);
    expect(
      build({
        sourceFile: apeChain,
        destinationFile: arbitrum,
        sourceTokenAddress: NATIVE_TOKEN_ADDRESS,
      }).options.map((option) => option.address),
    ).toEqual([APE_ARBITRUM]);
  });
});

describe('withImportedTokens', () => {
  const IMPORTED_ETHEREUM = '0x00000000000000000000000000000000000000f1';
  const IMPORTED_ARBITRUM = '0x00000000000000000000000000000000000000f2';
  const importedToken = (chainId: number, address: string): Token => ({
    id: toTokenId(chainId, address),
    chainId,
    address: address as Token['address'],
    symbol: 'NEW',
    name: 'New token',
    decimals: 18,
  });
  const deposit = {
    sourceToken: importedToken(1, IMPORTED_ETHEREUM),
    destinationToken: importedToken(42161, IMPORTED_ARBITRUM),
  };

  it('adds a deposit route that the destination options pick up', () => {
    const files = withImportedTokens({
      sourceFile: ethereum,
      destinationFile: arbitrumOne,
      imported: deposit,
    });
    const { options, defaultToken } = buildDestinationOptions({
      ...files,
      hasLifi: false,
      top,
      sourceTokenAddress: IMPORTED_ETHEREUM,
      layerZeroMetadata: null,
    });
    expect(options.map((option) => [option.address, option.providers])).toEqual([
      [IMPORTED_ARBITRUM, ['canonical']],
    ]);
    expect(defaultToken?.address).toBe(IMPORTED_ARBITRUM);
  });

  it('adds a withdrawal route, and keeps the metadata of a token a file already has', () => {
    const files = withImportedTokens({
      sourceFile: arbitrumOne,
      destinationFile: ethereum,
      imported: {
        sourceToken: importedToken(42161, IMPORTED_ARBITRUM),
        destinationToken: importedToken(1, USDC_ETHEREUM),
      },
    });
    expect(files.sourceFile.tokens.at(-1)).toMatchObject({
      address: IMPORTED_ARBITRUM,
      parentAddress: USDC_ETHEREUM,
    });
    expect(
      files.destinationFile.tokens.find((token) => token.address === USDC_ETHEREUM),
    ).toMatchObject({
      symbol: 'USDC',
      counterparts: { '42161': USDC_ARBITRUM },
    });
    expect(files.destinationFile.tokens).toHaveLength(ethereum.tokens.length);
  });
});
