import { isAddress } from 'viem';

import { normalizeToken } from '../normalize';
import { Address, ChainPair, RouteOption, SelectedTokenAvailability } from '../types';
import { CanonicalBridge, isCanonicalDeposit } from './canonicalBridge';
import { getPublicClient } from './publicClient';

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

type Erc20Metadata = { symbol: string; name: string; decimals: number };

function buildCanonicalImportAvailability({
  sourceToken,
  destinationToken,
}: {
  sourceToken: SelectedTokenAvailability['sourceToken'];
  destinationToken: SelectedTokenAvailability['destinationToken'];
}): SelectedTokenAvailability {
  const route: RouteOption = {
    provider: 'canonical',
    sourceToken,
    destinationToken,
  };

  return {
    sourceToken,
    destinationToken,
    availableRoutes: [route],
  };
}

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

async function deriveChildAddress(
  bridge: CanonicalBridge,
  parentAddress: Address,
): Promise<Address | null> {
  try {
    const child = await getPublicClient(bridge.parentChainId).readContract({
      address: bridge.parentGatewayRouter,
      abi: gatewayRouterAbi,
      functionName: 'calculateL2TokenAddress',
      args: [parentAddress],
    });
    return child.toLowerCase() as Address;
  } catch {
    return null;
  }
}

// calculateL2TokenAddress accepts any input, so require an enabled gateway.
async function canDeposit(bridge: CanonicalBridge, parentAddress: Address): Promise<boolean> {
  try {
    const gateway = await getPublicClient(bridge.parentChainId).readContract({
      address: bridge.parentGatewayRouter,
      abi: gatewayRouterAbi,
      functionName: 'l1TokenToGateway',
      args: [parentAddress],
    });
    return gateway.toLowerCase() !== DISABLED_GATEWAY;
  } catch {
    return false;
  }
}

async function resolveDeposit(
  bridge: CanonicalBridge,
  parentAddress: Address,
): Promise<SelectedTokenAvailability | null> {
  const parentMetadata = await readErc20Metadata(bridge.parentChainId, parentAddress);
  if (!parentMetadata) {
    return null;
  }

  if (!(await canDeposit(bridge, parentAddress))) {
    return null;
  }

  const childAddress = await deriveChildAddress(bridge, parentAddress);
  if (!childAddress) {
    return null;
  }

  // The child contract is deployed on first deposit, so its metadata may not exist yet.
  const childMetadata =
    (await readErc20Metadata(bridge.childChainId, childAddress)) ?? parentMetadata;

  const parentToken = normalizeToken({
    chainId: bridge.parentChainId,
    address: parentAddress,
    ...parentMetadata,
  });
  const childToken = normalizeToken({
    chainId: bridge.childChainId,
    address: childAddress,
    ...childMetadata,
  });

  return buildCanonicalImportAvailability({
    sourceToken: parentToken,
    destinationToken: childToken,
  });
}

async function resolveWithdrawal(
  bridge: CanonicalBridge,
  childAddress: Address,
): Promise<SelectedTokenAvailability | null> {
  const childMetadata = await readErc20Metadata(bridge.childChainId, childAddress);
  if (!childMetadata) {
    return null;
  }

  let parentAddress: Address;
  try {
    const result = await getPublicClient(bridge.childChainId).readContract({
      address: childAddress,
      abi: arbStandardTokenAbi,
      functionName: 'l1Address',
    });
    parentAddress = result.toLowerCase() as Address;
  } catch {
    return null;
  }

  const derivedChild = await deriveChildAddress(bridge, parentAddress);
  if (derivedChild !== childAddress) {
    return null;
  }

  const parentMetadata =
    (await readErc20Metadata(bridge.parentChainId, parentAddress)) ?? childMetadata;

  const childToken = normalizeToken({
    chainId: bridge.childChainId,
    address: childAddress,
    ...childMetadata,
  });
  const parentToken = normalizeToken({
    chainId: bridge.parentChainId,
    address: parentAddress,
    ...parentMetadata,
  });

  return buildCanonicalImportAvailability({
    sourceToken: childToken,
    destinationToken: parentToken,
  });
}

async function resolveDepositFromChild(
  bridge: CanonicalBridge,
  childAddress: Address,
): Promise<SelectedTokenAvailability | null> {
  const withdrawal = await resolveWithdrawal(bridge, childAddress);
  if (!withdrawal) {
    return null;
  }

  return resolveDeposit(bridge, withdrawal.destinationToken.address);
}

async function resolveWithdrawalFromParent(
  bridge: CanonicalBridge,
  parentAddress: Address,
): Promise<SelectedTokenAvailability | null> {
  if (!(await readErc20Metadata(bridge.parentChainId, parentAddress))) {
    return null;
  }

  const childAddress = await deriveChildAddress(bridge, parentAddress);
  if (!childAddress) {
    return null;
  }

  return resolveWithdrawal(bridge, childAddress);
}

export async function resolveImport({
  bridge,
  pair,
  rawAddress,
}: {
  bridge: CanonicalBridge;
  pair: ChainPair;
  rawAddress: string;
}): Promise<SelectedTokenAvailability | null> {
  if (!isAddress(rawAddress)) {
    return null;
  }
  const address = rawAddress.toLowerCase() as Address;

  if (isCanonicalDeposit(pair, bridge)) {
    return (await resolveDeposit(bridge, address)) ?? resolveDepositFromChild(bridge, address);
  }
  return (await resolveWithdrawal(bridge, address)) ?? resolveWithdrawalFromParent(bridge, address);
}
