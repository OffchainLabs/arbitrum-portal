import { getAPIBaseUrl } from '../util';
import { logger } from '../util/logger';

export async function addressIsDenylisted(address: string) {
  // The denylist consists of an array of addresses from Ethereum, Arbitrum One and Sepolia.
  // We do not separate them as it's unlikely for anyone to have a wallet address matching our contract addresses.
  try {
    const denylistResponse = await fetch(`${getAPIBaseUrl()}/api/denylist?address=${address}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    return (await denylistResponse.json()).data as boolean;
  } catch (error) {
    logger.error(error);
    return false;
  }
}
