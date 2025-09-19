import {
  createPublicClient,
  decodeFunctionResult,
  encodeFunctionData,
  http,
} from 'viem';
import { ARB_NETWORKS } from '../common/chains';
import { ORBIT_CHAINS } from '../common/orbitChains';

// Define ABI for ArbGasInfo precompile
const ARB_GAS_INFO_ABI = [
  {
    name: 'getL1BaseFeeEstimate',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256', name: 'baseFee' }],
  },
  {
    name: 'getGasAccountingParams',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [
      { type: 'uint256', name: 'speedLimitPerSecond' },
      { type: 'uint256', name: 'gasPoolMax' },
      { type: 'uint256', name: 'maxTxGasLimit' },
    ],
  },
];

// Define type for gas parameters
export interface ChainGasParams {
  gasSpeedLimitPerSecond: number | null;
}

/**
 * Get RPC URL for a chain by ID or title
 */
export function getChainRpcUrl(chainIdOrTitle: string): string | null {
  // Check if it's a core Arbitrum network
  const coreNetwork = ARB_NETWORKS.find(
    (chain) => chain.slug === chainIdOrTitle || chain.title === chainIdOrTitle,
  );

  if (coreNetwork) {
    if (coreNetwork.slug === 'arbitrum-one') {
      return 'https://arb1.arbitrum.io/rpc';
    } else if (coreNetwork.slug === 'arbitrum-nova') {
      return 'https://nova.arbitrum.io/rpc';
    }
  }

  // Check if it's an orbit chain
  const orbitChain = ORBIT_CHAINS.find(
    (chain) => chain.slug === chainIdOrTitle || chain.title === chainIdOrTitle,
  );

  if (orbitChain && orbitChain.chain && orbitChain.chain.rpcUrl) {
    return orbitChain.chain.rpcUrl;
  }

  return null;
}

/**
 * Fetch gas data for a specific chain
 */
export async function fetchGasDataForChain(
  chainIdOrTitle: string,
): Promise<ChainGasParams> {
  const defaultResponse = { gasSpeedLimitPerSecond: null };

  // Find the chain details
  const coreNetwork = ARB_NETWORKS.find(
    (chain) =>
      chain.slug.toLowerCase() === chainIdOrTitle.toLowerCase() ||
      chain.title.toLowerCase() === chainIdOrTitle.toLowerCase(),
  );

  const orbitChain = ORBIT_CHAINS.find(
    (chain) =>
      chain.slug.toLowerCase() === chainIdOrTitle.toLowerCase() ||
      chain.title.toLowerCase() === chainIdOrTitle.toLowerCase(),
  );

  // If we can't find the chain, return default response
  if (!coreNetwork && !orbitChain) {
    console.log(`Chain not found: ${chainIdOrTitle}`);
    return defaultResponse;
  }

  const chainTitle = coreNetwork?.title || orbitChain?.title || '';
  const rpcUrl = getChainRpcUrl(chainIdOrTitle);

  if (!rpcUrl) {
    console.log(`No RPC URL for ${chainTitle}, skipping`);
    return defaultResponse;
  }

  try {
    // Create the client with some additional configuration for better error handling
    const client = createPublicClient({
      transport: http(rpcUrl, {
        timeout: 10000, // 10 second timeout
        retryCount: 2,
        retryDelay: 1000,
      }),
    });

    // Attempt to get gas accounting params directly
    const gasParamsData = encodeFunctionData({
      abi: ARB_GAS_INFO_ABI,
      functionName: 'getGasAccountingParams',
    });

    const gasParams = await client.call({
      data: gasParamsData,
      to: '0x000000000000000000000000000000000000006C',
      blockTag: 'latest',
    });

    if (!gasParams || !gasParams.data) {
      console.log(`No gas params data returned for ${chainTitle}`);
      return defaultResponse;
    }

    const decoded = decodeFunctionResult({
      abi: ARB_GAS_INFO_ABI,
      functionName: 'getGasAccountingParams',
      data: gasParams.data,
    }) as [bigint, bigint, bigint];

    // Extract speed limit from the decoded result
    const [speedLimitPerSecond] = decoded;

    return {
      gasSpeedLimitPerSecond: Number(speedLimitPerSecond),
    };
  } catch (error) {
    console.error(`Error fetching gas data for ${chainTitle}:`, error);
    return defaultResponse;
  }
}
