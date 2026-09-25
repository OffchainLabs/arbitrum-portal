import { describe, expect, it } from 'vitest';

import { ChainId } from '../types/ChainId';
import { getAccountExplorerUrl } from './explorer';

describe('getAccountExplorerUrl', () => {
  it('uses the explorer account path registered for each ecosystem', () => {
    expect(
      getAccountExplorerUrl(ChainId.Ethereum, '0x1111111111111111111111111111111111111111'),
    ).toBe('https://etherscan.io/address/0x1111111111111111111111111111111111111111');
    expect(
      getAccountExplorerUrl(ChainId.Solana, 'So11111111111111111111111111111111111111112'),
    ).toBe('https://solscan.io/account/So11111111111111111111111111111111111111112');
  });
});
