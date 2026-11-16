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
  DEFAULT_SELECTION,
  DestinationChain,
  DestinationOption,
  HeldToken,
  HeldTokens,
  RegistryChainFile,
  RegistryFileToken,
  RegistryIndexFile,
  Selection,
  TOKEN_REGISTRY_URL,
  TokenList,
  TopFile,
  TopToken,
  getSearchScore,
  searchTokens,
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
import { readBalances } from './balanceReader';
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

// Each destination chain of a request reads the ranks of the same top file.
const ranksByTopFile = new WeakMap<TopFile, Map<string, number>>();

// A token's position among the top file's tokens of its own chain. The file lists one chain after
// the other, so a position in the whole file would put every token of the first chain first.
function getRanks(top: TopFile): Map<string, number> {
  const cached = ranksByTopFile.get(top);
  if (cached) {
    return cached;
  }
  const ranks = new Map<string, number>();
  const countByChainId = new Map<number, number>();
  for (const token of top.tokens) {
    const rank = countByChainId.get(token.chainId) ?? 0;
    countByChainId.set(token.chainId, rank + 1);
    ranks.set(`${token.chainId}:${token.address}`, rank);
  }
  ranksByTopFile.set(top, ranks);
  return ranks;
}

// By top-file rank, then the tokens outside the top file by symbol. localeCompare goes through
// Intl, which is slow on sorts of thousands of tokens.
function getTokenComparator(top: TopFile): (a: TopToken, b: TopToken) => number {
  const ranks = getRanks(top);
  const getRank = (token: TopToken) =>
    ranks.get(`${token.chainId}:${token.address}`) ?? Number.MAX_SAFE_INTEGER;
  return (a, b) =>
    getRank(a) - getRank(b) || (a.symbol < b.symbol ? -1 : a.symbol > b.symbol ? 1 : 0);
}

function toTopToken(chainId: number, token: RegistryFileToken): TopToken {
  return {
    chainId,
    address: token.address,
    symbol: token.symbol,
    name: token.name,
    decimals: token.decimals,
    ...(token.logoURI ? { logoURI: token.logoURI } : {}),
  };
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

  const compareTokens = getTokenComparator(top);
  const matches: { token: TopToken; score: number }[] = [];
  for (const file of chainFiles) {
    for (const token of file.tokens) {
      const score = getSearchScore(token, normalizedQuery);
      if (score !== null) {
        matches.push({ token: toTopToken(file.chainId, token), score });
      }
    }
  }

  return matches
    .sort((a, b) => a.score - b.score || compareTokens(a.token, b.token))
    .slice(0, limit)
    .map(({ token }) => token);
}

// The tokens of the chain file with a balance, in the order of the file.
export function toHeldTokens({
  chainFile,
  balances,
}: {
  chainFile: RegistryChainFile;
  balances: readonly bigint[];
}): HeldToken[] {
  return chainFile.tokens.flatMap((token, index) => {
    const balance = balances[index];
    return balance === undefined || balance === 0n
      ? []
      : [{ ...toTopToken(chainFile.chainId, token), balance: balance.toString() }];
  });
}

// One eth_call per chain reads the balance of every token in its file, top 1,000 or not.
export async function getHeldTokens(account: Address): Promise<HeldTokens> {
  const [index, top] = await Promise.all([getIndexFile(), getTopFile()]);
  const results = await Promise.all(
    index.chains.map(async ({ chainId }) => {
      try {
        const chainFile = await getChainFile(chainId);
        const balances = await readBalances({
          chainId,
          account,
          tokens: chainFile.tokens.map((token) => token.address as Address),
        });
        return { chainId, tokens: toHeldTokens({ chainFile, balances }) };
      } catch {
        // An RPC that fails or refuses the state override hides that chain's balances only.
        return { chainId, tokens: null };
      }
    }),
  );

  const tokens = results.flatMap((result) => result.tokens ?? []);
  const failedChainIds = results.flatMap((result) => (result.tokens ? [] : [result.chainId]));
  return { tokens: tokens.sort(getTokenComparator(top)), failedChainIds };
}

export async function searchRegistryTokens({
  query,
  chainId,
}: {
  query: string;
  chainId?: number;
}): Promise<TokenList> {
  const index = await getIndexFile();
  const chainIds = chainId === undefined ? index.chains.map((chain) => chain.chainId) : [chainId];
  const [top, ...chainFiles] = await Promise.all([getTopFile(), ...chainIds.map(getChainFile)]);
  // One more than the limit tells whether the limit cut the results.
  const matches = searchChainFiles({ chainFiles, top, query, limit: SEARCH_LIMIT + 1 });
  const tokens = matches.slice(0, SEARCH_LIMIT);
  const isComplete = matches.length <= SEARCH_LIMIT;

  const address = query.trim().toLowerCase();
  if (!isAddress(address) || tokens.some((token) => token.address === address)) {
    return { tokens, isComplete };
  }
  const imported = await Promise.all(
    (chainId === undefined ? IMPORT_LOOKUP_CHAIN_IDS : [chainId]).map((lookupChainId) =>
      importToken({ chainId: lookupChainId, address }),
    ),
  );
  return {
    tokens: [...imported.filter((token): token is TopToken => token !== null), ...tokens],
    isComplete,
  };
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

// The destinations of one chain before the default, which depends on the user's pick: the
// canonical token first, then LayerZero's, then the others by top-file rank.
type ChainOptions = {
  options: DestinationOption[];
  canonicalAddress?: string;
  layerZeroAddress?: string;
  // The default without a pick: the pair's override, otherwise the same token as the source.
  defaultCandidates: (string | undefined)[];
};

function buildChainOptions({
  sourceFile,
  destinationFile,
  hasLifi,
  top,
  sourceTokenAddress,
  layerZeroMetadata,
}: {
  sourceFile: RegistryChainFile;
  destinationFile: RegistryChainFile;
  // The bridge offers LiFi on the pair, and LiFi connects it.
  hasLifi: boolean;
  top: TopFile;
  sourceTokenAddress: string;
  // Null skips the OFT deposit block.
  layerZeroMetadata: LayerZeroMetadata | null;
}): ChainOptions {
  const pair = { sourceChainId: sourceFile.chainId, destinationChainId: destinationFile.chainId };
  const key = pairKey(pair);
  const sourceToken = sourceFile.tokens.find((token) => token.address === sourceTokenAddress);
  if (
    !sourceToken ||
    isExcludedToken(pair.sourceChainId, sourceToken.address) ||
    blockedSourceRoutes[key]?.includes(sourceToken.address as Address)
  ) {
    return { options: [], defaultCandidates: [] };
  }

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
        ...toTopToken(destinationFile.chainId, token),
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

  // LiFi swaps the source token into any token it routes on the destination chain.
  const pairLifiRoutes = hardcodedLifiRoutes[key] ?? {};
  const isLifiSource =
    !blockedLifiSourceRoutes[key]?.includes(sourceToken.address as Address) &&
    ((hasLifi && sourceToken.isLifi === true) || sourceToken.address in pairLifiRoutes);
  if (isLifiSource) {
    const hardcodedDestination = pairLifiRoutes[sourceToken.address as Address];
    if (hardcodedDestination) {
      add(hardcodedDestination, 'lifi');
    }
    if (hasLifi) {
      for (const token of destinationFile.tokens) {
        if (token.isLifi) {
          add(token.address, 'lifi');
        }
      }
    }
  }

  const compareTokens = getTokenComparator(top);
  const rank = (address: string) =>
    address === canonicalAddress ? 0 : address === layerZeroAddress ? 1 : 2;
  return {
    options: [...options.values()].sort(
      (a, b) => rank(a.address) - rank(b.address) || compareTokens(a, b),
    ),
    canonicalAddress,
    layerZeroAddress,
    defaultCandidates: [
      getDefaultDestinationOverride(pair, sourceToken.address as Address),
      sourceToken.counterparts?.[destinationFile.chainId],
    ],
  };
}

type DestinationOptions = {
  options: DestinationOption[];
  defaultToken?: DestinationOption;
  canonicalToken?: DestinationOption;
};

// The default is the token the user picked, otherwise the pair's override, otherwise the same token
// as the source, otherwise the canonical, LayerZero or native token. It comes right after the
// canonical and LayerZero tokens.
function withDefault(
  { options, canonicalAddress, layerZeroAddress, defaultCandidates }: ChainOptions,
  preferredAddress?: string,
): DestinationOptions {
  const find = (address: string | undefined) =>
    address === undefined ? undefined : options.find((option) => option.address === address);
  const defaultToken = [
    preferredAddress,
    ...defaultCandidates,
    canonicalAddress,
    layerZeroAddress,
    NATIVE_TOKEN_ADDRESS,
  ].reduce<DestinationOption | undefined>((found, address) => found ?? find(address), undefined);
  const isPinned = (option: DestinationOption) =>
    option.address === canonicalAddress || option.address === layerZeroAddress;
  const pinned = options.filter(isPinned);
  return {
    options:
      defaultToken && !isPinned(defaultToken)
        ? [
            ...pinned,
            defaultToken,
            ...options.filter((option) => !isPinned(option) && option !== defaultToken),
          ]
        : options,
    defaultToken,
    canonicalToken: find(canonicalAddress),
  };
}

export function buildDestinationOptions({
  preferredAddress,
  ...params
}: Parameters<typeof buildChainOptions>[0] & {
  // The token the user picked, or its counterpart on this chain.
  preferredAddress?: string;
}): DestinationOptions {
  return withDefault(buildChainOptions(params), preferredAddress);
}

function getPair(index: RegistryIndexFile, sourceChainId: number, destinationChainId: number) {
  return index.pairs.find(
    (pair) =>
      pair.sourceChainId === sourceChainId && pair.destinationChainId === destinationChainId,
  );
}

// The files every destination chain of a request reads. A route handler does not share fetches,
// so each fetch parses its file again.
type SourceFiles = {
  sourceFile: RegistryChainFile;
  top: TopFile;
  layerZeroMetadata: LayerZeroMetadata | null;
};

async function getSourceFiles(sourceChainId: number): Promise<SourceFiles> {
  const [sourceFile, top, layerZeroMetadata] = await Promise.all([
    getChainFile(sourceChainId),
    getTopFile(),
    getLayerZeroMetadata(),
  ]);
  return { sourceFile, top, layerZeroMetadata };
}

async function getChainOptions({
  sourceFiles: { sourceFile, top, layerZeroMetadata },
  sourceTokenAddress,
  destinationChainId,
  hasLifi,
  allowsImport,
}: {
  sourceFiles: SourceFiles;
  sourceTokenAddress: string;
  destinationChainId: number;
  hasLifi: boolean;
  allowsImport: boolean;
}): Promise<ChainOptions> {
  const sourceChainId = sourceFile.chainId;
  const destinationFile = await getChainFile(destinationChainId);
  const build = (files: { sourceFile: RegistryChainFile; destinationFile: RegistryChainFile }) =>
    buildChainOptions({ ...files, hasLifi, top, sourceTokenAddress, layerZeroMetadata });

  const result = build({ sourceFile, destinationFile });
  const pair = { sourceChainId, destinationChainId };
  const bridge = getCanonicalBridge(pair, { allowCustomGasToken: true });
  if (
    !allowsImport ||
    result.options.some((option) => option.providers.some((provider) => provider !== 'lifi')) ||
    !bridge ||
    sourceTokenAddress === NATIVE_TOKEN_ADDRESS
  ) {
    return result;
  }

  // The files only give LiFi routes, or none, for example for a token that nobody has bridged
  // to this chain yet. The import reads the chains to find the canonical route, caches the
  // result for an hour and applies the OFT deposit block.
  const imported = await getCachedImport({
    bridge,
    pair,
    sourceTokenAddress: sourceTokenAddress as Address,
  });
  // A pasted address of the other chain resolves to another source token, which the user did
  // not pick.
  if (imported?.sourceToken.address !== sourceTokenAddress) {
    return result;
  }

  const importedResult = build(withImportedTokens({ sourceFile, destinationFile, imported }));
  const importedAddress = imported.destinationToken.address;
  if (destinationFile.tokens.some((token) => token.address === importedAddress)) {
    return importedResult;
  }
  return {
    ...importedResult,
    options: importedResult.options.map((option) =>
      option.address === importedAddress ? { ...option, isImported: true } : option,
    ),
  };
}

type ChainDestinations = { chainId: number } & ChainOptions;

// The destinations of every chain the source reaches. Imports cost a few RPC calls per chain, so
// they only run when the files give the token no destination at all.
async function getAllChainOptions({
  sourceFiles,
  sourceTokenAddress,
}: {
  sourceFiles: SourceFiles;
  sourceTokenAddress: string;
}): Promise<ChainDestinations[]> {
  const index = await getIndexFile();
  const pairs = index.pairs.filter((pair) => pair.sourceChainId === sourceFiles.sourceFile.chainId);
  const getChains = async (allowsImport: boolean) =>
    (
      await Promise.all(
        pairs.map(async (pair) => ({
          chainId: pair.destinationChainId,
          ...(await getChainOptions({
            sourceFiles,
            sourceTokenAddress,
            destinationChainId: pair.destinationChainId,
            hasLifi: pair.hasLifi === true,
            allowsImport,
          })),
        })),
      )
    ).filter((chain) => chain.options.length > 0);

  const chainsFromFiles = await getChains(false);
  return chainsFromFiles.length > 0 ? chainsFromFiles : getChains(true);
}

// With a destination token the user picked, each chain defaults to that token, or to its
// counterpart on the chain, when the source can reach it. The chains with a canonical route come
// first.
export async function getDestinationChains({
  sourceChainId,
  sourceTokenAddress,
  preferredToken,
}: {
  sourceChainId: number;
  sourceTokenAddress: string;
  preferredToken?: { chainId: number; address: string };
}): Promise<DestinationChain[]> {
  const [chains, preferredFile] = await Promise.all([
    getSourceFiles(sourceChainId).then((sourceFiles) =>
      getAllChainOptions({ sourceFiles, sourceTokenAddress }),
    ),
    preferredToken ? getChainFile(preferredToken.chainId) : undefined,
  ]);
  const preferredCounterparts =
    preferredToken &&
    preferredFile?.tokens.find((token) => token.address === preferredToken.address)?.counterparts;
  const getPreferredAddress = (chainId: number) =>
    chainId === preferredToken?.chainId ? preferredToken.address : preferredCounterparts?.[chainId];

  return chains
    .flatMap((chain) => {
      const { defaultToken, canonicalToken } = withDefault(
        chain,
        getPreferredAddress(chain.chainId),
      );
      return defaultToken
        ? [{ chainId: chain.chainId, defaultToken, ...(canonicalToken ? { canonicalToken } : {}) }]
        : [];
    })
    .sort((a, b) => Number(Boolean(b.canonicalToken)) - Number(Boolean(a.canonicalToken)));
}

// A token of the chain's file, or a token read from the chain like a pasted address. Null when the
// address is not a token.
async function resolveSourceToken({
  chainId,
  address,
}: {
  chainId: number;
  address: string;
}): Promise<TopToken | null> {
  if (!isAddress(address)) {
    return null;
  }
  const chainFile = await getChainFile(chainId);
  const token = chainFile.tokens.find((candidate) => candidate.address === address);
  return token ? toTopToken(chainId, token) : importToken({ chainId, address });
}

// The tokens of the page's URL, without top.json. A chain outside the registry falls back to the
// default selection, Ether on Ethereum to Arbitrum One. Like Jumper, an unknown token on a registry
// chain selects no token, and the source picker opens on that chain. A requested destination token
// stays the default of its chain when the source reaches it, like a token the user picked.
export async function getSelection({
  sourceChainId,
  sourceTokenAddress,
  destinationChainId,
  destinationTokenAddress,
}: {
  sourceChainId: number;
  sourceTokenAddress: string;
  destinationChainId?: number;
  destinationTokenAddress?: string;
}): Promise<Selection> {
  const index = await getIndexFile();
  const isRegistryChain = index.chains.some((chain) => chain.chainId === sourceChainId);
  const request = isRegistryChain
    ? { sourceChainId, sourceTokenAddress, destinationChainId, destinationTokenAddress }
    : {
        ...DEFAULT_SELECTION,
        sourceTokenAddress: NATIVE_TOKEN_ADDRESS,
        destinationTokenAddress: undefined,
      };

  const sourceToken = await resolveSourceToken({
    chainId: request.sourceChainId,
    address: request.sourceTokenAddress,
  });
  if (!sourceToken) {
    return { sourceChainId: request.sourceChainId, destinationChains: [] };
  }

  const destinationChains = await getDestinationChains({
    sourceChainId: sourceToken.chainId,
    sourceTokenAddress: sourceToken.address,
    preferredToken:
      request.destinationChainId !== undefined && request.destinationTokenAddress
        ? { chainId: request.destinationChainId, address: request.destinationTokenAddress }
        : undefined,
  });
  const destinationChain =
    destinationChains.find((chain) => chain.chainId === request.destinationChainId) ??
    destinationChains[0];
  return {
    sourceChainId: sourceToken.chainId,
    sourceToken,
    destinationChains,
    ...(destinationChain
      ? {
          destinationChainId: destinationChain.chainId,
          destinationToken: destinationChain.defaultToken,
        }
      : {}),
  };
}

// Without a destination chain, the tokens of every chain the source reaches, up to 1,000 per
// chain like the source list: the canonical tokens first, then LayerZero's, then the others by
// top-file rank. A chain's default or the user's pick does not change this order. The list is
// complete when no chain was cut, and the picker then searches it without the server.
export async function getDestinationTokens({
  sourceChainId,
  sourceTokenAddress,
  destinationChainId,
  query,
}: {
  sourceChainId: number;
  sourceTokenAddress: string;
  destinationChainId?: number;
  query?: string;
}): Promise<TokenList<DestinationOption>> {
  let options: DestinationOption[];
  let isComplete: boolean;
  if (destinationChainId === undefined) {
    const sourceFiles = await getSourceFiles(sourceChainId);
    const chains = await getAllChainOptions({ sourceFiles, sourceTokenAddress });
    const compareTokens = getTokenComparator(sourceFiles.top);
    const rank = (option: DestinationOption) =>
      option.providers.includes('canonical') ? 0 : option.providers.includes('layerzero') ? 1 : 2;
    // A search covers every token, past the 1,000 of each chain.
    options = chains
      .flatMap((chain) =>
        query?.trim() ? chain.options : chain.options.slice(0, DESTINATION_TOKENS_LIMIT),
      )
      .sort((a, b) => rank(a) - rank(b) || compareTokens(a, b));
    isComplete = chains.every((chain) => chain.options.length <= DESTINATION_TOKENS_LIMIT);
  } else {
    const [index, sourceFiles] = await Promise.all([getIndexFile(), getSourceFiles(sourceChainId)]);
    const pair = getPair(index, sourceChainId, destinationChainId);
    if (!pair) {
      return { tokens: [], isComplete: true };
    }
    ({ options } = withDefault(
      await getChainOptions({
        sourceFiles,
        sourceTokenAddress,
        destinationChainId,
        hasLifi: pair.hasLifi === true,
        allowsImport: true,
      }),
    ));
    isComplete = options.length <= DESTINATION_TOKENS_LIMIT;
  }

  if (query?.trim()) {
    const matches = searchTokens(options, query);
    return {
      tokens: matches.slice(0, SEARCH_LIMIT),
      isComplete: matches.length <= SEARCH_LIMIT,
    };
  }
  // Without a destination chain, each chain was already cut at the limit.
  return {
    tokens: destinationChainId === undefined ? options : options.slice(0, DESTINATION_TOKENS_LIMIT),
    isComplete,
  };
}
