import { describe, expect, it } from 'vitest';

import { ChainId } from '../types/ChainId';
import { getAccountExplorerUrl, getExplorerUrl } from './networks';

describe('getAccountExplorerUrl', () => {
  it('uses the account path of each ecosystem explorer', () => {
    expect(
      getAccountExplorerUrl(ChainId.Ethereum, '0x1111111111111111111111111111111111111111'),
    ).toBe('https://etherscan.io/address/0x1111111111111111111111111111111111111111');
    expect(
      getAccountExplorerUrl(ChainId.Solana, 'So11111111111111111111111111111111111111112'),
    ).toBe(`${getExplorerUrl(ChainId.Solana)}/account/So11111111111111111111111111111111111111112`);
  });
});
