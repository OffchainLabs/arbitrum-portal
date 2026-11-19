import { unstable_cache } from 'next/cache';
import { isAddress } from 'viem';

import {
  ChainIds,
  blockedLifiSourceRoutes,
  blockedSourceRoutes,
  canonicalBlockExemptions,
  getDefaultDestinationOverride,
  isExcludedToken,
  layerZeroConfig,
} from '../constants';
import {
  DEFAULT_SELECTION,
  DestinationChain,
  DestinationOption,
  DestinationSelection,
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
  getTokenComparator,
  searchTokens,
  tokenKey,
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
import { getCachedImport } from './cachedImport';
import { getCanonicalBridge, isCanonicalTransferAllowed } from './canonicalBridge';
import { readErc20Metadata } from './resolveImport';

export const SEARCH_LIMIT = 50;
export const DESTINATION_TOKENS_LIMIT = 1_000;

// Like Jumper, a pasted address that no file knows is only looked up on the selected chain, or
// without one on these chains.
const IMPORT_LOOKUP_CHAIN_IDS = [ChainIds.Ethereum, ChainIds.ArbitrumOne, ChainIds.Base];

// The Ethereum file is about 1.5 MB, under Next's 2 MiB fetch-cache limit.
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
  chains = [],
}: {
  chainFiles: RegistryChainFile[];
  top: TopFile;
  query: string;
  limit?: number;
  chains?: RegistryIndexFile['chains'];
}): TopToken[] {
  const normalizedQuery = query.trim().toLowerCase();
  if (normalizedQuery.length === 0) {
    return [];
  }

  const compareTokens = getTokenComparator(top);
  const matches: { token: TopToken; score: number }[] = [];
  for (const file of chainFiles) {
    for (const token of file.tokens) {
      const score = getSearchScore(
        token,
        normalizedQuery,
        chains.find((chain) => chain.chainId === file.chainId)?.name,
      );
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
  const matches = searchChainFiles({
    chainFiles,
    top,
    query,
    chains: index.chains,
    limit: SEARCH_LIMIT + 1,
  });
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

// The bridge's policy: the transfer-disabled and withdraw-only lists, and the OFT deposit block.
// The registry job applies the bridge's OFT rule and lists the child chains a parent token's
// deposit may not reach. The exemptions stay here.
function isCanonicalRouteAllowed({
  pair,
  isDeposit,
  sourceToken,
  destinationAddress,
}: {
  pair: ChainPair;
  isDeposit: boolean;
  sourceToken: RegistryFileToken;
  destinationAddress: string;
}): boolean {
  const bridge = isDeposit
    ? { parentChainId: pair.sourceChainId, childChainId: pair.destinationChainId }
    : { parentChainId: pair.destinationChainId, childChainId: pair.sourceChainId };
  const parentTokenAddress = (isDeposit ? sourceToken.address : destinationAddress) as Address;
  if (!isCanonicalTransferAllowed({ bridge, pair, parentTokenAddress })) {
    return false;
  }

  return (
    !isDeposit ||
    !sourceToken.oftBlockedChainIds?.includes(pair.destinationChainId) ||
    (canonicalBlockExemptions[pair.destinationChainId]?.includes(parentTokenAddress) ?? false)
  );
}

// The destinations of one chain before the default, which depends on the user's pick, by top-file
// rank like the source list.
type ChainOptions = {
  options: DestinationOption[];
  canonicalAddress?: string;
  layerZeroAddress?: string;
  overrideAddress?: string;
  // The same asset as the source on this chain.
  counterpartAddress?: string;
};

function buildChainOptions({
  sourceFile,
  destinationFile,
  hasLifi,
  top,
  sourceTokenAddress,
}: {
  sourceFile: RegistryChainFile;
  destinationFile: RegistryChainFile;
  // The bridge offers LiFi on the pair, and LiFi connects it.
  hasLifi: boolean;
  top: TopFile;
  sourceTokenAddress: string;
}): ChainOptions {
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
        ...(sourceToken.counterparts?.[destinationFile.chainId] === address
          ? { isCounterpart: true as const }
          : {}),
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
  if (
    hasLifi &&
    sourceToken.isLifi === true &&
    !blockedLifiSourceRoutes[key]?.includes(sourceToken.address as Address)
  ) {
    for (const token of destinationFile.tokens) {
      if (token.isLifi) {
        add(token.address, 'lifi');
      }
    }
  }

  return {
    options: [...options.values()].sort(getTokenComparator(top)),
    canonicalAddress,
    layerZeroAddress,
    overrideAddress: getDefaultDestinationOverride(pair, sourceToken.address as Address),
    counterpartAddress: sourceToken.counterparts?.[destinationFile.chainId],
  };
}

type DestinationOptions = {
  options: DestinationOption[];
  defaultToken?: DestinationOption;
  canonicalToken?: DestinationOption;
};

// The default is the token the user picked, otherwise the first route in this order: the pair's
// override, the canonical token, the LayerZero token, the same asset through LiFi, the native token,
// then any other token by rank. It does not change the order of the list.
function withDefault(
  {
    options,
    canonicalAddress,
    layerZeroAddress,
    overrideAddress,
    counterpartAddress,
  }: ChainOptions,
  preferredAddress?: string,
): DestinationOptions {
  const find = (address: string | undefined) =>
    address === undefined ? undefined : options.find((option) => option.address === address);
  const lifiCounterpart = find(counterpartAddress);
  const defaultToken =
    [preferredAddress, overrideAddress, canonicalAddress, layerZeroAddress]
      .map(find)
      .find(Boolean) ??
    (lifiCounterpart?.providers.includes('lifi') ? lifiCounterpart : undefined) ??
    find(NATIVE_TOKEN_ADDRESS) ??
    options[0];
  return {
    options,
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
};

async function getSourceFiles(sourceChainId: number): Promise<SourceFiles> {
  const [sourceFile, top] = await Promise.all([getChainFile(sourceChainId), getTopFile()]);
  return { sourceFile, top };
}

async function getChainOptions({
  sourceFiles: { sourceFile, top },
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
    buildChainOptions({ ...files, hasLifi, top, sourceTokenAddress });

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

// The tokens of the page's URL. A chain outside the registry falls back to the default selection,
// Ether on Ethereum to Arbitrum One. Like Jumper, a token outside the chain's file selects no token,
// and the source picker opens on that chain. A token the user imported through the search still
// gets its destinations, so the page can show them for the pick. A requested destination token
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

  const { sourceChainId: chainId, sourceTokenAddress: address } = request;
  const chainFile = await getChainFile(chainId);
  const fileToken = chainFile.tokens.find((token) => token.address === address);
  const sourceToken = fileToken
    ? toTopToken(chainId, fileToken)
    : isAddress(address)
      ? await importToken({ chainId, address })
      : null;
  if (!sourceToken) {
    return { sourceChainId: chainId, destinationChains: [] };
  }

  const destinationChains = await getDestinationChains({
    sourceChainId: chainId,
    sourceTokenAddress: address,
    preferredToken:
      request.destinationChainId !== undefined &&
      request.destinationTokenAddress &&
      index.chains.some((chain) => chain.chainId === request.destinationChainId)
        ? { chainId: request.destinationChainId, address: request.destinationTokenAddress }
        : undefined,
  });
  const destinationChain =
    destinationChains.find((chain) => chain.chainId === request.destinationChainId) ??
    destinationChains[0];
  return {
    sourceChainId: chainId,
    ...(sourceToken ? { sourceToken } : {}),
    destinationChains,
    ...(!isRegistryChain
      ? {
          adjustment: {
            kind: 'source-chain' as const,
            message: 'The source network is outside the registry. Showing the default transfer.',
          },
        }
      : request.destinationChainId !== undefined &&
          (destinationChain?.chainId !== request.destinationChainId ||
            (request.destinationTokenAddress !== undefined &&
              destinationChain?.defaultToken.address !== request.destinationTokenAddress))
        ? {
            adjustment: {
              kind: 'destination' as const,
              message: destinationChain
                ? `The requested destination is unavailable from this source. Selected ${destinationChain.defaultToken.symbol} on ${index.chains.find((chain) => chain.chainId === destinationChain.chainId)?.name ?? destinationChain.chainId}.`
                : 'This source has no supported destination.',
            },
          }
        : {}),
    ...(destinationChain
      ? {
          destinationChainId: destinationChain.chainId,
          destinationToken: destinationChain.defaultToken,
        }
      : {}),
  };
}

// Without a destination chain, the tokens of every chain the source reaches, up to 1,000 per
// chain like the source list, and in the same order: by top-file rank.
// A chain's default or the user's pick does not change this order. The list is complete when no
// chain was cut, and the picker then searches it without the server.
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
    // A search covers every token, past the 1,000 of each chain.
    options = chains
      .flatMap((chain) =>
        query?.trim() ? chain.options : chain.options.slice(0, DESTINATION_TOKENS_LIMIT),
      )
      .sort(getTokenComparator(sourceFiles.top));
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
    const matches = searchTokens(options, query, (await getIndexFile()).chains);
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

export async function getEligibleDestinationTokens({
  sourceChainId,
  sourceTokenAddress,
  candidates,
}: {
  sourceChainId: number;
  sourceTokenAddress: string;
  candidates: Pick<TopToken, 'chainId' | 'address'>[];
}): Promise<TokenList<DestinationOption>> {
  const index = await getIndexFile();
  if (!index.chains.some((chain) => chain.chainId === sourceChainId)) {
    return { tokens: [], isComplete: true };
  }
  const sourceFiles = await getSourceFiles(sourceChainId);
  const requested = new Set(candidates.map(tokenKey));
  const chainIds = new Set(candidates.map((token) => token.chainId));
  const pairs = index.pairs.filter(
    (pair) => pair.sourceChainId === sourceChainId && chainIds.has(pair.destinationChainId),
  );
  const options = await Promise.all(
    pairs.map((pair) =>
      getChainOptions({
        sourceFiles,
        sourceTokenAddress,
        destinationChainId: pair.destinationChainId,
        hasLifi: pair.hasLifi === true,
        allowsImport: true,
      }),
    ),
  );
  return {
    tokens: options
      .flatMap((chain) => chain.options)
      .filter((token) => requested.has(tokenKey(token)))
      .sort(getTokenComparator(sourceFiles.top)),
    isComplete: true,
  };
}

// Evaluate the forward route for each source. A reverse route or matching symbol is not proof.
export function buildSourcesForDestination({
  sourceFile,
  destinationFile,
  destinationTokenAddress,
  hasLifi,
  top,
}: {
  sourceFile: RegistryChainFile;
  destinationFile: RegistryChainFile;
  destinationTokenAddress: string;
  hasLifi: boolean;
  top: TopFile;
}): { sourceToken: TopToken; destinationToken: DestinationOption }[] {
  const destination = destinationFile.tokens.find(
    (token) => token.address === destinationTokenAddress,
  );
  if (!destination) return [];
  return sourceFile.tokens.flatMap((sourceToken) => {
    const { options } = buildChainOptions({
      sourceFile: { ...sourceFile, tokens: [sourceToken] },
      destinationFile: { ...destinationFile, tokens: [destination] },
      sourceTokenAddress: sourceToken.address,
      hasLifi,
      top,
    });
    const option = options.find((token) => token.address === destinationTokenAddress);
    return option
      ? [{ sourceToken: toTopToken(sourceFile.chainId, sourceToken), destinationToken: option }]
      : [];
  });
}

export async function resolveDestinationSelection({
  sourceChainId,
  sourceTokenAddress,
  destinationChainId,
  destinationTokenAddress,
}: {
  sourceChainId: number;
  sourceTokenAddress: string;
  destinationChainId: number;
  destinationTokenAddress: string;
}): Promise<DestinationSelection> {
  const index = await getIndexFile();
  const pairs = index.pairs.filter((pair) => pair.destinationChainId === destinationChainId);
  if (!pairs.length)
    return { kind: 'unavailable', reason: 'No supported incoming route for this network.' };
  const [destinationFile, top, sourceFiles] = await Promise.all([
    getChainFile(destinationChainId),
    getTopFile(),
    Promise.all(pairs.map((pair) => getChainFile(pair.sourceChainId))),
  ]);
  const currentPair = pairs.find((pair) => pair.sourceChainId === sourceChainId);
  const currentFile = sourceFiles.find((file) => file.chainId === sourceChainId);
  if (currentPair && currentFile) {
    const { options } = await getChainOptions({
      sourceFiles: { sourceFile: currentFile, top },
      sourceTokenAddress,
      destinationChainId,
      hasLifi: currentPair.hasLifi === true,
      allowsImport: true,
    });
    const destinationToken = options.find((token) => token.address === destinationTokenAddress);
    if (destinationToken) {
      const known = currentFile.tokens.find((token) => token.address === sourceTokenAddress);
      const sourceToken = known
        ? toTopToken(sourceChainId, known)
        : await importToken({ chainId: sourceChainId, address: sourceTokenAddress });
      if (sourceToken)
        return { kind: 'resolved', sourceToken, destinationToken, sourceChanged: false };
    }
  }
  const candidates = sourceFiles.flatMap((sourceFile) =>
    buildSourcesForDestination({
      sourceFile,
      destinationFile,
      destinationTokenAddress,
      hasLifi: pairs.some((pair) => pair.sourceChainId === sourceFile.chainId && pair.hasLifi),
      top,
    }),
  );
  if (!candidates.length && destinationTokenAddress !== NATIVE_TOKEN_ADDRESS) {
    const imports = await Promise.all(
      sourceFiles.map(async (sourceFile) => {
        const pair = { sourceChainId: sourceFile.chainId, destinationChainId };
        const bridge = getCanonicalBridge(pair, { allowCustomGasToken: true });
        if (!bridge) return [];
        const imported = await getCachedImport({
          bridge,
          pair,
          sourceTokenAddress: destinationTokenAddress as Address,
        });
        if (!imported || imported.destinationToken.address !== destinationTokenAddress) return [];
        const files = withImportedTokens({ sourceFile, destinationFile, imported });
        return buildSourcesForDestination({
          ...files,
          destinationTokenAddress,
          hasLifi: false,
          top,
        }).map((candidate) => ({
          sourceToken: {
            ...candidate.sourceToken,
            ...(!sourceFile.tokens.some((token) => token.address === candidate.sourceToken.address)
              ? { isImported: true as const }
              : {}),
          },
          destinationToken: {
            ...candidate.destinationToken,
            ...(!destinationFile.tokens.some((token) => token.address === destinationTokenAddress)
              ? { isImported: true as const }
              : {}),
          },
        }));
      }),
    );
    candidates.push(...imports.flat());
  }
  const compare = getTokenComparator(top);
  candidates.sort(
    (a, b) =>
      Number(b.sourceToken.chainId === sourceChainId) -
        Number(a.sourceToken.chainId === sourceChainId) ||
      Number(b.sourceToken.chainId === destinationFile.parentChainId) -
        Number(a.sourceToken.chainId === destinationFile.parentChainId) ||
      Number(Boolean(b.destinationToken.isCounterpart)) -
        Number(Boolean(a.destinationToken.isCounterpart)) ||
      compare(a.sourceToken, b.sourceToken),
  );
  const chosen = candidates[0];
  return chosen
    ? {
        kind: 'resolved',
        ...chosen,
        sourceChanged:
          tokenKey(chosen.sourceToken) !==
          tokenKey({ chainId: sourceChainId, address: sourceTokenAddress }),
      }
    : {
        kind: 'unavailable',
        reason:
          'No supported source could be found for this token. Choose another token or try again after the registry updates.',
      };
}
