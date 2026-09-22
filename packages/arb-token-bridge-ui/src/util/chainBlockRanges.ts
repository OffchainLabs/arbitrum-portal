/**
 * Largest `eth_getLogs` block range each chain's RPC serves reliably, measured per chain. Chains
 * absent from the map impose no range we have hit, so callers pick their own default.
 *
 * Anything scanning event logs must go through this, or it produces an RPC error instead of a
 * result on the chains listed here.
 */
export const BATCH_FETCH_BLOCKS: { [key: number]: number } = {
  33139: 100_000, // ApeChain
  41923: 20_000, // Edu Chain
  1628: 10_000, // T-REX
  869: 10_000, // World Mobile Chain
  680: 10_000, // JASMY Chain
  20010: 10_000, // Mandala Chain
  704851: 10_000, // Mars Chain
  8818: 10_000, // C Link Chain Mainnet
  1962: 10_000, // T-Rex Testnet
  681: 10_000, // JASMY Chain Testnet
  20011: 10_000, // Mandala Chain Testnet
  704852: 10_000, // Mars Chain Testnet
};

export function getBatchFetchBlocks(chainId: number): number | undefined {
  return BATCH_FETCH_BLOCKS[chainId];
}
