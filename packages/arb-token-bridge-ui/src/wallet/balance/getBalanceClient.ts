import { getWalletEcosystem } from '../getWalletEcosystem';
import { solanaBalanceClient } from '../solana';
import { evmBalanceClient } from './evm';

export function getBalanceClient(chainId: number) {
  return getWalletEcosystem(chainId) === 'solana' ? solanaBalanceClient : evmBalanceClient;
}
