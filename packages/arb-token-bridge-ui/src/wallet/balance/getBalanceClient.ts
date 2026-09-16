import { getWalletEcosystem } from '../getWalletEcosystem';
import { evmBalanceClient } from './evm';
import { solanaBalanceClient } from './solana';

export function getBalanceClient(chainId: number) {
  return getWalletEcosystem(chainId) === 'solana' ? solanaBalanceClient : evmBalanceClient;
}
