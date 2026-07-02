import { describe, expect, it } from 'vitest';

import { canFetchTransactionHistory } from '../canFetchTransactionHistory';

const address = '0x1798440327d78ebb19db0c8999e2368eaed8f413';

describe('canFetchTransactionHistory', () => {
  it('allows fetching for a searched EOA without a connected chain', () => {
    expect(
      canFetchTransactionHistory({
        address,
        isLoadingAccountType: false,
        isTxHistoryEnabled: true,
        isSmartContractWallet: false,
        connectedChainId: undefined,
      }),
    ).toBe(true);
  });

  it('blocks fetching for smart contract wallets without a connected chain', () => {
    expect(
      canFetchTransactionHistory({
        address,
        isLoadingAccountType: false,
        isTxHistoryEnabled: true,
        isSmartContractWallet: true,
        connectedChainId: undefined,
      }),
    ).toBe(false);
  });

  it('allows fetching for smart contract wallets with a connected chain', () => {
    expect(
      canFetchTransactionHistory({
        address,
        isLoadingAccountType: false,
        isTxHistoryEnabled: true,
        isSmartContractWallet: true,
        connectedChainId: 11155111,
      }),
    ).toBe(true);
  });

  it('prefers the shared fetch guards before chain-specific logic', () => {
    expect(
      canFetchTransactionHistory({
        address: undefined,
        isLoadingAccountType: false,
        isTxHistoryEnabled: true,
        isSmartContractWallet: false,
        connectedChainId: undefined,
      }),
    ).toBe(false);

    expect(
      canFetchTransactionHistory({
        address,
        isLoadingAccountType: true,
        isTxHistoryEnabled: true,
        isSmartContractWallet: false,
        connectedChainId: 11155111,
      }),
    ).toBe(false);

    expect(
      canFetchTransactionHistory({
        address,
        isLoadingAccountType: false,
        isTxHistoryEnabled: false,
        isSmartContractWallet: false,
        connectedChainId: 11155111,
      }),
    ).toBe(false);
  });
});
