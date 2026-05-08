import { describe, expect, it } from 'vitest';

import { ChainId } from '../types/ChainId';
import { CommonAddress } from './CommonAddressUtils';
import { isTransferDisabledToken } from './TokenTransferDisabledUtils';

describe('isTransferDisabledToken', () => {
  it('disables canonical PYUSD transfers on Arbitrum One', () => {
    expect(isTransferDisabledToken(CommonAddress.Ethereum.PYUSD, ChainId.ArbitrumOne)).toBe(true);
  });

  it('keeps the disable list scoped to the configured child chain', () => {
    expect(isTransferDisabledToken(CommonAddress.Ethereum.PYUSD, ChainId.ArbitrumNova)).toBe(false);
  });
});
