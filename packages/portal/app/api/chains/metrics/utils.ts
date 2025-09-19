import { DuneClient } from '@duneanalytics/client-sdk';

// Custom error class for Dune API errors
export class DuneAPIError extends Error {
  constructor(message: string, public statusCode: number = 500) {
    super(message);
    this.name = 'DuneAPIError';
  }
}

// The Dune query ID for chains metrics
export const CHAINS_QUERY_ID = 4628498;

// Define the chain data interface to match the Dune query results
export interface ChainMetricsData {
  chainName: string;
  slug: string;
  chainCount: number;
  tvl: number;
  wallets: number;
  transactions: number;
  tps: number;
  status: 'active' | 'coming_soon';
}

// Type guard for Dune API response
export function isDuneResponse(
  data: any,
): data is { result?: { rows?: any[] } } {
  return data && typeof data === 'object' && 'result' in data;
}

// Helper function to convert string to title case
export function toTitleCase(str: string): string {
  // Words that should stay lowercase in title case (except at start of string)
  const smallWords =
    /^(a|an|and|as|at|but|by|en|for|if|in|nor|of|on|or|per|the|to|v\.?|vs\.?|via)$/i;

  return str
    .toLowerCase()
    .split(/\s+/)
    .map((word, index, array) => {
      // Always capitalize the first and last word
      if (index === 0 || index === array.length - 1) {
        return word.charAt(0).toUpperCase() + word.slice(1);
      }
      // Check if it's a small word that should stay lowercase
      if (smallWords.test(word)) {
        return word;
      }
      // Otherwise capitalize the first letter
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}

// Validate required fields in a row
export function validateRow(row: any): void {
  const requiredFields = [
    'chain',
    'slug',
    'chain_count',
    'overall_tvl',
    'wallets',
    'transactions',
    'average_tps',
  ];
  const missingFields = requiredFields.filter((field) => !(field in row));

  if (missingFields.length > 0) {
    throw new DuneAPIError(
      `Missing required fields in Dune response: ${missingFields.join(', ')}`,
      422,
    );
  }
}

// Main function to fetch chain metrics data from Dune
export async function fetchChainMetricsFromDune(
  apiKey: string,
): Promise<ChainMetricsData[]> {
  if (!apiKey) {
    throw new DuneAPIError('Dune API key is not configured', 511);
  }

  // Create Dune client using API key
  const dune = new DuneClient(apiKey);

  let result;
  try {
    result = await dune.getLatestResult({ queryId: CHAINS_QUERY_ID });
  } catch (error) {
    throw new DuneAPIError(
      `Failed to fetch data from Dune API: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`,
      503,
    );
  }

  // Validate response structure
  if (!isDuneResponse(result)) {
    throw new DuneAPIError('Invalid response structure from Dune API', 422);
  }

  if (!result.result?.rows) {
    throw new DuneAPIError('No data returned from Dune API', 404);
  }

  // Process the data
  const chainsData: ChainMetricsData[] = [];

  // Format the data for frontend use
  result.result.rows.forEach((row) => {
    try {
      // Skip the "total" row as it contains aggregate data
      if (row.slug === 'total') return;

      // Validate row data
      validateRow(row);

      const slug = row.slug as string;

      // Use the 'chain' field as the chain name, converted to title case
      const chainName = toTitleCase(row.chain as string);

      // Ensure numeric values are valid
      const chainCount = Number(row.chain_count);
      const tvl = Number(row.overall_tvl);
      const wallets = Number(row.wallets);
      const transactions = Number(row.transactions);
      const tps = Number(row.average_tps);

      if (
        isNaN(chainCount) ||
        isNaN(tvl) ||
        isNaN(wallets) ||
        isNaN(transactions) ||
        isNaN(tps)
      ) {
        throw new DuneAPIError(`Invalid numeric values for chain ${slug}`, 422);
      }

      chainsData.push({
        chainName,
        slug,
        chainCount,
        tvl,
        wallets,
        transactions,
        tps,
        status: row.status === 'Coming soon' ? 'coming_soon' : 'active',
      });
    } catch (error) {
      console.error(`Error processing row for chain ${row.slug}:`, error);
      // Continue processing other rows even if one fails
    }
  });

  if (chainsData.length === 0) {
    throw new DuneAPIError('No valid chain data after processing', 404);
  }

  return chainsData;
}
