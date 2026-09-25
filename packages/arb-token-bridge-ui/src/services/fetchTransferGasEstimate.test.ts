import { BigNumber } from 'ethers';
import { expect, it, vi } from 'vitest';

import { ChainId } from '../types/ChainId';
import { getEvmWalletConfig } from './evm/walletConfig';
import { fetchTransferGasEstimate } from './fetchTransferGasEstimate';

vi.mock('./evm/walletConfig', () => ({
  getEvmWalletConfig: vi.fn(() => {
    throw new Error('EVM runtime must not load');
  }),
}));
it('does not fall back to an EVM estimator while a non-EVM quote is unavailable', async () => {
  await expect(
    fetchTransferGasEstimate([
      undefined,
      ChainId.Solana,
      ChainId.ArbitrumOne,
      undefined,
      undefined,
      undefined,
      BigNumber.from(1),
      undefined,
    ]),
  ).rejects.toThrow('No transfer quote is available');
  expect(getEvmWalletConfig).not.toHaveBeenCalled();
});
