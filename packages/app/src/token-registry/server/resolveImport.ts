import { createPublicClient, http, isAddress } from 'viem';

import { rpcURLs } from '@/bridge/util/networks';

import { ChainIds, canonicalRouteExclusions } from '../constants';
import { normalizeToken } from '../normalize';
import { Address, ChainPair, ImportResolution, pairKey } from '../types';

// L1GatewayRouter for Arbitrum One
const L1_GATEWAY_ROUTER = '0x72ce9c846789fdb6fc1f34ac4ad25dd9ef7031ef' as Address;

const erc20Abi = [
  {
    type: 'function',
    name: 'symbol',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'string' }],
  },
  {
    type: 'function',
    name: 'name',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'string' }],
  },
  {
    type: 'function',
    name: 'decimals',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint8' }],
  },
] as const;

// the router maps deposit-disabled tokens to this sentinel gateway
const DISABLED_GATEWAY = '0x0000000000000000000000000000000000000001';

const gatewayRouterAbi = [
  {
    type: 'function',
    name: 'calculateL2TokenAddress',
    stateMutability: 'view',
    inputs: [{ name: 'l1ERC20', type: 'address' }],
    outputs: [{ type: 'address' }],
  },
  {
    type: 'function',
    name: 'l1TokenToGateway',
    stateMutability: 'view',
    inputs: [{ name: 'l1ERC20', type: 'address' }],
    outputs: [{ type: 'address' }],
  },
] as const;

const arbStandardTokenAbi = [
  {
    type: 'function',
    name: 'l1Address',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'address' }],
  },
] as const;

function getPublicClient(chainId: number) {
  const url = rpcURLs[chainId];
  if (!url) {
    throw new Error(`No RPC URL configured for chain ${chainId}`);
  }
  return createPublicClient({ transport: http(url) });
}

type Erc20Metadata = { symbol: string; name: string; decimals: number };

async function readErc20Metadata(chainId: number, address: Address): Promise<Erc20Metadata | null> {
  const client = getPublicClient(chainId);
  try {
    const [symbol, name, decimals] = await Promise.all([
      client.readContract({ address, abi: erc20Abi, functionName: 'symbol' }),
      client.readContract({ address, abi: erc20Abi, functionName: 'name' }),
      client.readContract({
        address,
        abi: erc20Abi,
        functionName: 'decimals',
      }),
    ]);
    return { symbol, name, decimals };
  } catch {
    return null;
  }
}

async function deriveChildAddress(parentAddress: Address): Promise<Address | null> {
  try {
    const child = await getPublicClient(ChainIds.Ethereum).readContract({
      address: L1_GATEWAY_ROUTER,
      abi: gatewayRouterAbi,
      functionName: 'calculateL2TokenAddress',
      args: [parentAddress],
    });
    return child.toLowerCase() as Address;
  } catch {
    return null;
  }
}

/**
 * Registration check: calculateL2TokenAddress derives an address for ANY
 * input, so a token whose deposits are disabled on the router would
 * otherwise yield a false-positive canonical route.
 */
async function isDepositDisabled(parentAddress: Address): Promise<boolean> {
  try {
    const gateway = await getPublicClient(ChainIds.Ethereum).readContract({
      address: L1_GATEWAY_ROUTER,
      abi: gatewayRouterAbi,
      functionName: 'l1TokenToGateway',
      args: [parentAddress],
    });
    return gateway.toLowerCase() === DISABLED_GATEWAY;
  } catch {
    // cannot verify → do not import
    return true;
  }
}

async function resolveDeposit(parentAddress: Address): Promise<ImportResolution | null> {
  const parentMetadata = await readErc20Metadata(ChainIds.Ethereum, parentAddress);
  if (!parentMetadata) {
    return null;
  }

  if (await isDepositDisabled(parentAddress)) {
    return null;
  }

  const childAddress = await deriveChildAddress(parentAddress);
  if (!childAddress) {
    return null;
  }

  // the child contract only deploys on first deposit — fall back to the
  // parent's metadata when it doesn't exist yet
  const childMetadata =
    (await readErc20Metadata(ChainIds.ArbitrumOne, childAddress)) ?? parentMetadata;

  const parentToken = normalizeToken({
    chainId: ChainIds.Ethereum,
    address: parentAddress,
    ...parentMetadata,
  });
  const childToken = normalizeToken({
    chainId: ChainIds.ArbitrumOne,
    address: childAddress,
    ...childMetadata,
  });

  return {
    tokens: [parentToken, childToken],
    routes: [
      {
        provider: 'canonical',
        sourceTokenId: parentToken.id,
        destinationTokenId: childToken.id,
      },
    ],
  };
}

async function resolveWithdrawal(childAddress: Address): Promise<ImportResolution | null> {
  const childMetadata = await readErc20Metadata(ChainIds.ArbitrumOne, childAddress);
  if (!childMetadata) {
    return null;
  }

  let parentAddress: Address;
  try {
    const result = await getPublicClient(ChainIds.ArbitrumOne).readContract({
      address: childAddress,
      abi: arbStandardTokenAbi,
      functionName: 'l1Address',
    });
    parentAddress = result.toLowerCase() as Address;
  } catch {
    // not a standard bridged token — no canonical withdrawal route
    return null;
  }

  // confirm the parent → child derivation round-trips to the pasted token
  const derivedChild = await deriveChildAddress(parentAddress);
  if (derivedChild !== childAddress) {
    return null;
  }

  const parentMetadata =
    (await readErc20Metadata(ChainIds.Ethereum, parentAddress)) ?? childMetadata;

  const childToken = normalizeToken({
    chainId: ChainIds.ArbitrumOne,
    address: childAddress,
    ...childMetadata,
  });
  const parentToken = normalizeToken({
    chainId: ChainIds.Ethereum,
    address: parentAddress,
    ...parentMetadata,
  });

  return {
    tokens: [childToken, parentToken],
    routes: [
      {
        provider: 'canonical',
        sourceTokenId: childToken.id,
        destinationTokenId: parentToken.id,
      },
    ],
  };
}

/**
 * canonical.resolve() — import only considers the canonical provider: CCTP
 * and LayerZero are hardcoded (complete by definition) and the LiFi snapshot
 * is exhaustive by construction.
 */
export async function resolveImport(
  pair: ChainPair,
  rawAddress: string,
): Promise<ImportResolution | null> {
  if (!isAddress(rawAddress)) {
    return null;
  }
  const address = rawAddress.toLowerCase() as Address;

  // tokens whose canonical transfer is disabled on this pair (e.g. PYUSD
  // deposits) must not be importable through canonical either
  if (canonicalRouteExclusions[pairKey(pair)]?.includes(address)) {
    return null;
  }

  if (
    pair.sourceChainId === ChainIds.Ethereum &&
    pair.destinationChainId === ChainIds.ArbitrumOne
  ) {
    return resolveDeposit(address);
  }
  if (
    pair.sourceChainId === ChainIds.ArbitrumOne &&
    pair.destinationChainId === ChainIds.Ethereum
  ) {
    return resolveWithdrawal(address);
  }
  return null;
}
