import { unstable_cache } from 'next/cache';
import { isAddress } from 'viem';

import {
  ChainIds,
  blockedLifiSourceRoutes,
  blockedSourceRoutes,
  canonicalBlockExemptions,
  getDefaultDestinationOverride,
  hardcodedLifiRoutes,
  isExcludedToken,
  layerZeroConfig,
} from '../constants';
import {
  DestinationChain,
  DestinationOption,
  RegistryChainFile,
  RegistryFileToken,
  RegistryIndexFile,
  RegistryPairFile,
  TOKEN_REGISTRY_URL,
  TopFile,
  TopToken,
} from '../registryFiles';
import {
  Address,
  ChainPair,
  NATIVE_TOKEN_ADDRESS,
  ProviderId,
  SelectedTokenAvailability,
  Token,
  pairKey,
} from '../types';
import { getCanonicalBridge, isCanonicalTransferAllowed } from './canonicalBridge';
import { getCachedImport } from './generate';
import {
  LayerZeroMetadata,
  getLayerZeroMetadata,
  isListedByLayerZero,
  isOftDepositBlocked,
} from './oftDeposits';
import { readErc20Metadata } from './resolveImport';

export const SEARCH_LIMIT = 50;
export const DESTINATION_TOKENS_LIMIT = 1_000;

// Like Jumper, a pasted address that no file knows is only looked up on the selected chain, or
// without one on these chains.
const IMPORT_LOOKUP_CHAIN_IDS = [ChainIds.Ethereum, ChainIds.ArbitrumOne];

// The Ethereum file is about 1.4 MB, under Next's 2 MiB fetch-cache limit.
async function fetchRegistryFile<T>(file: string): Promise<T> {
  const response = await fetch(`${TOKEN_REGISTRY_URL}/${file}`, {
    next: { revalidate: 3_600 },
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch ${file}: ${response.status}`);
  }
  return (await response.json()) as T;
}

const getIndexFile = () => fetchRegistryFile<RegistryIndexFile>('index.json');
const getTopFile = () => fetchRegistryFile<TopFile>('top.json');
const getChainFile = (chainId: number) =>
  fetchRegistryFile<RegistryChainFile>(`chains/${chainId}.json`);
const getPairFile = (sourceChainId: number, destinationChainId: number) =>
  fetchRegistryFile<RegistryPairFile>(`pairs/${sourceChainId}-${destinationChainId}.json`);

function getVolumes(top: TopFile): Map<string, number> {
  return new Map(
    top.tokens.flatMap((token) =>
      token.volumeUSD24H === undefined
        ? []
        : [[`${token.chainId}:${token.address}`, token.volumeUSD24H] as const],
    ),
  );
}

function toTopToken(
  chainId: number,
  token: RegistryFileToken,
  volumes: Map<string, number>,
): TopToken {
  const volumeUSD24H = volumes.get(`${chainId}:${token.address}`);
  return {
    chainId,
    address: token.address,
    symbol: token.symbol,
    name: token.name,
    decimals: token.decimals,
    ...(token.logoURI ? { logoURI: token.logoURI } : {}),
    ...(volumeUSD24H === undefined ? {} : { volumeUSD24H }),
  };
}

// Lower is better. An address only matches itself.
function getSearchScore(token: RegistryFileToken, query: string): number | null {
  if (isAddress(query)) {
    return token.address === query ? 0 : null;
  }
  const symbol = token.symbol.toLowerCase();
  if (symbol === query) {
    return 0;
  }
  if (symbol.startsWith(query)) {
    return 1;
  }
  if (symbol.includes(query)) {
    return 2;
  }
  return token.name.toLowerCase().includes(query) ? 3 : null;
}

function compareTokens(a: TopToken, b: TopToken): number {
  return (b.volumeUSD24H ?? 0) - (a.volumeUSD24H ?? 0) || a.symbol.localeCompare(b.symbol);
}

export function searchChainFiles({
  chainFiles,
  top,
  query,
  limit = SEARCH_LIMIT,
}: {
  chainFiles: RegistryChainFile[];
  top: TopFile;
  query: string;
  limit?: number;
}): TopToken[] {
  const normalizedQuery = query.trim().toLowerCase();
  if (normalizedQuery.length === 0) {
    return [];
  }

  const volumes = getVolumes(top);
  const matches: { token: TopToken; score: number }[] = [];
  for (const file of chainFiles) {
    for (const token of file.tokens) {
      const score = getSearchScore(token, normalizedQuery);
      if (score !== null) {
        matches.push({ token: toTopToken(file.chainId, token, volumes), score });
      }
    }
  }

  return matches
    .sort((a, b) => a.score - b.score || compareTokens(a.token, b.token))
    .slice(0, limit)
    .map(({ token }) => token);
}

export async function searchRegistryTokens({
  query,
  chainId,
}: {
  query: string;
  chainId?: number;
}): Promise<TopToken[]> {
  const index = await getIndexFile();
  const chainIds = chainId === undefined ? index.chains.map((chain) => chain.chainId) : [chainId];
  const [top, ...chainFiles] = await Promise.all([getTopFile(), ...chainIds.map(getChainFile)]);
  const tokens = searchChainFiles({ chainFiles, top, query });

  const address = query.trim().toLowerCase();
  if (!isAddress(address) || tokens.some((token) => token.address === address)) {
    return tokens;
  }
  const imported = await Promise.all(
    (chainId === undefined ? IMPORT_LOOKUP_CHAIN_IDS : [chainId]).map((lookupChainId) =>
      importToken({ chainId: lookupChainId, address }),
    ),
  );
  return [...imported.filter((token): token is TopToken => token !== null), ...tokens];
}

function importToken({
  chainId,
  address,
}: {
  chainId: number;
  address: string;
}): Promise<TopToken | null> {
  if (isExcludedToken(chainId, address)) {
    return Promise.resolve(null);
  }
  return unstable_cache(
    async (): Promise<TopToken | null> => {
      const metadata = await readErc20Metadata(chainId, address as Address);
      return metadata ? { chainId, address, ...metadata, isImported: true } : null;
    },
    [`token-registry-files-import-${chainId}-${address}`],
    { revalidate: 3_600 },
  )();
}

function toFileToken(token: Token, parentAddress?: string): RegistryFileToken {
  return {
    address: token.address,
    symbol: token.symbol,
    name: token.name,
    decimals: token.decimals,
    ...(token.logoURI ? { logoURI: token.logoURI } : {}),
    ...(parentAddress ? { parentAddress } : {}),
  };
}

// Adds an imported canonical route to the two chain files, as if the token lists had it: the
// child token's parentAddress points at the parent token. A token already in a file keeps its
// metadata.
export function withImportedTokens({
  sourceFile,
  destinationFile,
  imported,
}: {
  sourceFile: RegistryChainFile;
  destinationFile: RegistryChainFile;
  imported: Pick<SelectedTokenAvailability, 'sourceToken' | 'destinationToken'>;
}): { sourceFile: RegistryChainFile; destinationFile: RegistryChainFile } {
  const isDeposit = destinationFile.parentChainId === sourceFile.chainId;
  const withToken = (file: RegistryChainFile, token: Token, parentAddress?: string) => {
    const existing = file.tokens.find((candidate) => candidate.address === token.address);
    const merged = {
      ...(existing ?? toFileToken(token)),
      ...(parentAddress ? { parentAddress } : {}),
    };
    return {
      ...file,
      tokens: [...file.tokens.filter((candidate) => candidate !== existing), merged],
    };
  };

  return {
    sourceFile: withToken(
      sourceFile,
      imported.sourceToken,
      isDeposit ? undefined : imported.destinationToken.address,
    ),
    destinationFile: withToken(
      destinationFile,
      imported.destinationToken,
      isDeposit ? imported.sourceToken.address : undefined,
    ),
  };
}

// Canonical routes only join a parent chain and its child chain. Ether only goes to Ether between
// two Ether gas chains: on a custom gas token chain, the native token has a parent token.
function getCanonicalDestinationAddress({
  sourceFile,
  destinationFile,
  sourceToken,
}: {
  sourceFile: RegistryChainFile;
  destinationFile: RegistryChainFile;
  sourceToken: RegistryFileToken;
}): string | undefined {
  const isNative = sourceToken.address === NATIVE_TOKEN_ADDRESS;
  if (destinationFile.parentChainId === sourceFile.chainId) {
    const child = destinationFile.tokens.find(
      (token) => token.parentAddress === sourceToken.address,
    );
    const destinationNative = destinationFile.tokens.find(
      (token) => token.address === NATIVE_TOKEN_ADDRESS,
    );
    if (child) {
      return child.address;
    }
    return isNative && !destinationNative?.parentAddress ? NATIVE_TOKEN_ADDRESS : undefined;
  }
  if (sourceFile.parentChainId === destinationFile.chainId) {
    return sourceToken.parentAddress ?? (isNative ? NATIVE_TOKEN_ADDRESS : undefined);
  }
  return undefined;
}

// The per-pair registry's policy: blocked tokens, the transfer-disabled and withdraw-only lists,
// and the OFT deposit block.
function isCanonicalRouteAllowed({
  pair,
  isDeposit,
  sourceToken,
  destinationAddress,
  layerZeroMetadata,
}: {
  pair: ChainPair;
  isDeposit: boolean;
  sourceToken: RegistryFileToken;
  destinationAddress: string;
  layerZeroMetadata: LayerZeroMetadata | null;
}): boolean {
  const bridge = isDeposit
    ? { parentChainId: pair.sourceChainId, childChainId: pair.destinationChainId }
    : { parentChainId: pair.destinationChainId, childChainId: pair.sourceChainId };
  const parentTokenAddress = (isDeposit ? sourceToken.address : destinationAddress) as Address;
  if (!isCanonicalTransferAllowed({ bridge, pair, parentTokenAddress })) {
    return false;
  }

  if (
    !isDeposit ||
    !layerZeroMetadata ||
    parentTokenAddress === NATIVE_TOKEN_ADDRESS ||
    // Master deposits a custom gas token as the native token, without the OFT check.
    destinationAddress === NATIVE_TOKEN_ADDRESS ||
    canonicalBlockExemptions[pair.destinationChainId]?.includes(parentTokenAddress)
  ) {
    return true;
  }
  return !isOftDepositBlocked({
    metadata: layerZeroMetadata,
    parentChainId: pair.sourceChainId,
    childChainId: pair.destinationChainId,
    parentTokenAddress,
    childTokenAddress: destinationAddress as Address,
    isOftOnChain:
      sourceToken.isOft === true &&
      !isListedByLayerZero({
        metadata: layerZeroMetadata,
        chainId: pair.sourceChainId,
        address: parentTokenAddress,
      }),
  });
}

// The canonical token comes first, then LayerZero's, then the default destination, then the
// others by volume. The default is the token the user picked, otherwise the pair's override,
// otherwise the same token as the source, otherwise the canonical, LayerZero or native token.
export function buildDestinationOptions({
  sourceFile,
  destinationFile,
  pairFile,
  top,
  sourceTokenAddress,
  preferredAddress,
  layerZeroMetadata,
}: {
  sourceFile: RegistryChainFile;
  destinationFile: RegistryChainFile;
  pairFile: RegistryPairFile;
  top: TopFile;
  sourceTokenAddress: string;
  // The token the user picked, or its counterpart on this chain.
  preferredAddress?: string;
  // Null skips the OFT deposit block.
  layerZeroMetadata: LayerZeroMetadata | null;
}): { options: DestinationOption[]; defaultToken?: DestinationOption } {
  const pair = { sourceChainId: sourceFile.chainId, destinationChainId: destinationFile.chainId };
  const key = pairKey(pair);
  const sourceToken = sourceFile.tokens.find((token) => token.address === sourceTokenAddress);
  if (
    !sourceToken ||
    isExcludedToken(pair.sourceChainId, sourceToken.address) ||
    blockedSourceRoutes[key]?.includes(sourceToken.address as Address)
  ) {
    return { options: [] };
  }

  const volumes = getVolumes(top);
  const destinationTokens = new Map(destinationFile.tokens.map((token) => [token.address, token]));
  const options = new Map<string, DestinationOption>();
  const add = (address: string, provider: ProviderId) => {
    const option = options.get(address);
    if (option) {
      if (!option.providers.includes(provider)) {
        option.providers.push(provider);
      }
      return;
    }
    const token = destinationTokens.get(address);
    if (token && !isExcludedToken(pair.destinationChainId, address)) {
      options.set(address, {
        ...toTopToken(destinationFile.chainId, token, volumes),
        providers: [provider],
      });
    }
  };

  const canonicalCandidate = getCanonicalDestinationAddress({
    sourceFile,
    destinationFile,
    sourceToken,
  });
  const canonicalAddress =
    canonicalCandidate &&
    isCanonicalRouteAllowed({
      pair,
      isDeposit: destinationFile.parentChainId === sourceFile.chainId,
      sourceToken,
      destinationAddress: canonicalCandidate,
      layerZeroMetadata,
    })
      ? canonicalCandidate
      : undefined;
  if (canonicalAddress) {
    add(canonicalAddress, 'canonical');
  }

  const layerZeroAddress = layerZeroConfig[key]?.[sourceToken.address as Address]?.destination;
  if (layerZeroAddress) {
    add(layerZeroAddress, 'layerzero');
  }

  // LiFi swaps the source token into any token it lists on the destination chain.
  const pairLifiRoutes = hardcodedLifiRoutes[key] ?? {};
  const isLifiSource =
    !blockedLifiSourceRoutes[key]?.includes(sourceToken.address as Address) &&
    (pairFile.lifi?.fromTokens.includes(sourceToken.address) ||
      sourceToken.address in pairLifiRoutes);
  if (isLifiSource) {
    const hardcodedDestination = pairLifiRoutes[sourceToken.address as Address];
    if (hardcodedDestination) {
      add(hardcodedDestination, 'lifi');
    }
    for (const address of pairFile.lifi?.toTokens ?? []) {
      add(address, 'lifi');
    }
  }

  const defaultAddress = [
    preferredAddress,
    getDefaultDestinationOverride(pair, sourceToken.address as Address),
    sourceToken.counterparts?.[destinationFile.chainId],
    canonicalAddress,
    layerZeroAddress,
    NATIVE_TOKEN_ADDRESS,
  ].find((address) => address !== undefined && options.has(address));
  const rank = (address: string) =>
    address === canonicalAddress
      ? 0
      : address === layerZeroAddress
        ? 1
        : address === defaultAddress
          ? 2
          : 3;
  return {
    options: [...options.values()].sort(
      (a, b) => rank(a.address) - rank(b.address) || compareTokens(a, b),
    ),
    defaultToken: defaultAddress ? options.get(defaultAddress) : undefined,
  };
}

async function getDestinationOptions({
  sourceChainId,
  sourceTokenAddress,
  destinationChainId,
  preferredAddress,
}: {
  sourceChainId: number;
  sourceTokenAddress: string;
  destinationChainId: number;
  preferredAddress?: string;
}): Promise<ReturnType<typeof buildDestinationOptions>> {
  const [registrySourceFile, registryDestinationFile, pairFile, top, layerZeroMetadata] =
    await Promise.all([
      getChainFile(sourceChainId),
      getChainFile(destinationChainId),
      getPairFile(sourceChainId, destinationChainId),
      getTopFile(),
      getLayerZeroMetadata(),
    ]);
  let files = { sourceFile: registrySourceFile, destinationFile: registryDestinationFile };
  let importedAddress: string | undefined;

  // Without a canonical route in the files, an import looks for one, as in the per-pair registry:
  // the token lists may not know a token that LiFi lists, or any file may miss it. The import
  // reads the chains, caches the result for an hour and applies the OFT deposit block.
  const pair = { sourceChainId, destinationChainId };
  const bridge = getCanonicalBridge(pair, { allowCustomGasToken: true });
  const registrySourceToken = registrySourceFile.tokens.find(
    (token) => token.address === sourceTokenAddress,
  );
  if (
    bridge &&
    sourceTokenAddress !== NATIVE_TOKEN_ADDRESS &&
    !(
      registrySourceToken &&
      getCanonicalDestinationAddress({
        sourceFile: registrySourceFile,
        destinationFile: registryDestinationFile,
        sourceToken: registrySourceToken,
      })
    )
  ) {
    const imported = await getCachedImport({
      bridge,
      pair,
      sourceTokenAddress: sourceTokenAddress as Address,
    });
    // A pasted address of the other chain resolves to another source token, which the user did
    // not pick.
    if (imported?.sourceToken.address === sourceTokenAddress) {
      files = withImportedTokens({ ...files, imported });
      if (
        !registryDestinationFile.tokens.some(
          (token) => token.address === imported.destinationToken.address,
        )
      ) {
        importedAddress = imported.destinationToken.address;
      }
    }
  }

  const result = buildDestinationOptions({
    ...files,
    pairFile,
    top,
    sourceTokenAddress,
    preferredAddress,
    layerZeroMetadata,
  });
  if (!importedAddress) {
    return result;
  }
  const markImported = (option: DestinationOption): DestinationOption =>
    option.address === importedAddress ? { ...option, isImported: true } : option;
  return {
    options: result.options.map(markImported),
    defaultToken: result.defaultToken && markImported(result.defaultToken),
  };
}

// With a destination token the user picked, each chain defaults to that token, or to its
// counterpart on the chain, when the source can reach it.
export async function getDestinationChains({
  sourceChainId,
  sourceTokenAddress,
  preferredToken,
}: {
  sourceChainId: number;
  sourceTokenAddress: string;
  preferredToken?: { chainId: number; address: string };
}): Promise<DestinationChain[]> {
  const [index, preferredFile] = await Promise.all([
    getIndexFile(),
    preferredToken ? getChainFile(preferredToken.chainId) : undefined,
  ]);
  const preferredCounterparts =
    preferredToken &&
    preferredFile?.tokens.find((token) => token.address === preferredToken.address)?.counterparts;
  const getPreferredAddress = (chainId: number) =>
    chainId === preferredToken?.chainId ? preferredToken.address : preferredCounterparts?.[chainId];

  const destinationChainIds = index.pairs
    .filter((pair) => pair.sourceChainId === sourceChainId)
    .map((pair) => pair.destinationChainId);

  const chains = await Promise.all(
    destinationChainIds.map(async (destinationChainId) => {
      const { defaultToken } = await getDestinationOptions({
        sourceChainId,
        sourceTokenAddress,
        destinationChainId,
        preferredAddress: getPreferredAddress(destinationChainId),
      });
      return defaultToken ? { chainId: destinationChainId, defaultToken } : null;
    }),
  );
  return chains.filter((chain): chain is DestinationChain => chain !== null);
}

export async function getDestinationTokens({
  sourceChainId,
  sourceTokenAddress,
  destinationChainId,
  query,
}: {
  sourceChainId: number;
  sourceTokenAddress: string;
  destinationChainId: number;
  query?: string;
}): Promise<DestinationOption[]> {
  const { options } = await getDestinationOptions({
    sourceChainId,
    sourceTokenAddress,
    destinationChainId,
  });
  if (!query?.trim()) {
    return options.slice(0, DESTINATION_TOKENS_LIMIT);
  }

  const normalizedQuery = query.trim().toLowerCase();
  return options
    .flatMap((option) => {
      const score = getSearchScore(option, normalizedQuery);
      return score === null ? [] : [{ option, score }];
    })
    .sort((a, b) => a.score - b.score)
    .slice(0, SEARCH_LIMIT)
    .map(({ option }) => option);
}
