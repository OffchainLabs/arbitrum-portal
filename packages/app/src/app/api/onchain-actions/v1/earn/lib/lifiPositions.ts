import { PublicClient, erc20Abi, formatUnits, getAddress } from 'viem';

import { ChainId } from '@/bridge/types/ChainId';

import { OpportunityCategory, type StandardUserPosition, Vendor } from '../types';
import { type LiquidStakingOpportunitySeed } from './liquidStaking';
import {
  type ZerionPriceLookup,
  getZerionLookupCacheKey,
  getZerionPriceLookup,
} from './zerionPriceSources';
import { fetchZerionCurrentPrices } from './zerionService';

// Alchemy occasionally returns HTML ("Unspecified error") with a non-JSON body
// during partial outages. viem doesn't retry these (no HTTP status, just a JSON
// parse failure), so we retry transient-looking RPC failures ourselves.
const TRANSIENT_RPC_PATTERNS = [
  /http request failed/i,
  /is not valid json/i,
  /fetch failed/i,
  /socket hang up/i,
  /etimedout/i,
  /econnreset/i,
  /\b50\d\b/,
];

function isTransientRpcError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const message = `${error.message} ${
    (error as { cause?: { message?: string } }).cause?.message ?? ''
  }`;
  return TRANSIENT_RPC_PATTERNS.some((re) => re.test(message));
}

async function readErc20BalanceWithRetry(params: {
  publicClient: PublicClient;
  tokenAddress: string;
  userAddress: string;
  attempts?: number;
}): Promise<bigint> {
  const { publicClient, tokenAddress, userAddress, attempts = 3 } = params;
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      // eslint-disable-next-line no-await-in-loop -- retry must be sequential
      return await publicClient.readContract({
        address: getAddress(tokenAddress),
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [getAddress(userAddress)],
      });
    } catch (error) {
      lastError = error;
      if (attempt === attempts - 1 || !isTransientRpcError(error)) {
        throw error;
      }
      // eslint-disable-next-line no-await-in-loop -- intentional backoff
      await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
    }
  }
  throw lastError;
}

export async function fetchLiquidStakingPriceMap(
  opportunities: LiquidStakingOpportunitySeed[],
): Promise<Map<string, number | null>> {
  const lookupByOppId = new Map<string, ZerionPriceLookup | null>();
  for (const opportunity of opportunities) {
    lookupByOppId.set(
      opportunity.id.toLowerCase(),
      getZerionPriceLookup({
        chainId: ChainId.ArbitrumOne,
        tokenAddress: opportunity.id,
        assetSymbol: opportunity.token,
      }),
    );
  }

  const validLookups = Array.from(lookupByOppId.values()).filter(
    (lookup): lookup is ZerionPriceLookup => lookup !== null,
  );
  // Don't fail the whole positions endpoint if price setup is misconfigured —
  // fall back to an empty map so balances still surface with valueUsd: null.
  let priceMap: Map<string, number | null> = new Map();
  try {
    priceMap = await fetchZerionCurrentPrices(validLookups);
  } catch (error) {
    console.warn('[earn][lifi] price fetch failed, continuing without prices:', error);
  }

  const tokenPriceMap = new Map<string, number | null>();
  for (const [oppId, lookup] of lookupByOppId) {
    if (!lookup) {
      tokenPriceMap.set(oppId, null);
      continue;
    }
    const price = priceMap.get(getZerionLookupCacheKey(lookup)) ?? null;
    tokenPriceMap.set(oppId, price !== null && price > 0 ? price : null);
  }
  return tokenPriceMap;
}

export async function fetchLifiUserPositions(params: {
  publicClient: PublicClient;
  opportunities: LiquidStakingOpportunitySeed[];
  userAddress: string;
}): Promise<StandardUserPosition[]> {
  const { publicClient, opportunities, userAddress } = params;

  const tokenPriceMap = await fetchLiquidStakingPriceMap(opportunities);

  const positions: StandardUserPosition[] = [];

  for (const opportunity of opportunities) {
    const tokenAddress = opportunity.id;

    try {
      // eslint-disable-next-line no-await-in-loop -- intentionally sequential to avoid bursting the RPC
      const balance = await readErc20BalanceWithRetry({
        publicClient,
        tokenAddress,
        userAddress,
      });

      if (balance === BigInt(0)) {
        continue;
      }

      const decimalsNumber = opportunity.tokenDecimals;
      const balanceInTokens = parseFloat(formatUnits(balance, decimalsNumber));
      const effectivePrice = tokenPriceMap.get(tokenAddress.toLowerCase()) ?? null;
      const valueUsdNumber =
        effectivePrice !== null && Number.isFinite(effectivePrice)
          ? balanceInTokens * effectivePrice
          : null;
      // rawApy is a percentage value (e.g. 3.5 means 3.5%)
      const apy = opportunity.rawApy ?? 0;
      const projectedEarningsUsdNumber =
        valueUsdNumber !== null && valueUsdNumber > 0 && apy > 0
          ? (valueUsdNumber * apy) / 100
          : undefined;

      positions.push({
        opportunityId: tokenAddress,
        category: OpportunityCategory.LiquidStaking,
        vendor: Vendor.LiFi,
        network: 'arbitrum',
        amount: balance.toString(),
        valueUsd: valueUsdNumber,
        tokenAddress,
        tokenSymbol: opportunity.token,
        tokenDecimals: decimalsNumber,
        tokenIcon: opportunity.tokenIcon,
        projectedEarningsUsd: projectedEarningsUsdNumber,
        tokenPriceUsd: effectivePrice,
        opportunity: {
          id: tokenAddress,
          name: opportunity.name,
          protocol: opportunity.protocol,
          protocolLogo: opportunity.protocolIcon,
          apy,
          tvl: opportunity.rawTvl ?? undefined,
        },
      });
    } catch (error) {
      const shortMessage =
        error instanceof Error
          ? ((error as { shortMessage?: string }).shortMessage ?? error.message.split('\n')[0])
          : String(error);
      console.error(`Failed to fetch balance for ${tokenAddress}: ${shortMessage}`);
    }
  }

  return positions;
}
