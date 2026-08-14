import { beforeEach, describe, expect, it } from 'vitest';

import {
  TransactionHistorySearchError,
  useTransactionHistoryAddressStore,
} from '../TransactionHistorySearchBar';

const VALID_ADDRESS = '0x1111111111111111111111111111111111111111';
const VALID_TX_HASH = '0x94e3f5f7ae10d9b98df828b7bfa3b7b1c7f0e2a1b4b28ee1cf2a4dbecdd6bbf1';

describe('useTransactionHistoryAddressStore', () => {
  beforeEach(() => {
    useTransactionHistoryAddressStore.setState({
      address: '',
      sanitizedAddress: undefined,
      sanitizedTxHash: undefined,
      searchMode: 'address',
      searchError: undefined,
    });
  });

  it('defaults to address search mode', () => {
    expect(useTransactionHistoryAddressStore.getState().searchMode).toBe('address');
  });

  it('setSanitizedAddress ignores invalid addresses', () => {
    const { setSanitizedAddress } = useTransactionHistoryAddressStore.getState();
    setSanitizedAddress('not-an-address');
    expect(useTransactionHistoryAddressStore.getState().sanitizedAddress).toBeUndefined();

    setSanitizedAddress(VALID_ADDRESS);
    expect(useTransactionHistoryAddressStore.getState().sanitizedAddress).toBe(VALID_ADDRESS);
  });

  it('setSanitizedTxHash accepts a valid hash and undefined, ignores invalid values', () => {
    const { setSanitizedTxHash } = useTransactionHistoryAddressStore.getState();

    setSanitizedTxHash('0x123');
    expect(useTransactionHistoryAddressStore.getState().sanitizedTxHash).toBeUndefined();

    setSanitizedTxHash(VALID_TX_HASH);
    expect(useTransactionHistoryAddressStore.getState().sanitizedTxHash).toBe(VALID_TX_HASH);

    setSanitizedTxHash(undefined);
    expect(useTransactionHistoryAddressStore.getState().sanitizedTxHash).toBeUndefined();
  });

  it('setSearchMode clears the search error and the sanitized tx hash', () => {
    const { setSanitizedTxHash, setSearchError, setSearchMode } =
      useTransactionHistoryAddressStore.getState();

    setSearchMode('txHash');
    setSanitizedTxHash(VALID_TX_HASH);
    setSearchError(TransactionHistorySearchError.INVALID_TX_HASH);

    setSearchMode('address');

    const state = useTransactionHistoryAddressStore.getState();
    expect(state.searchMode).toBe('address');
    expect(state.searchError).toBeUndefined();
    expect(state.sanitizedTxHash).toBeUndefined();
  });

  it('keeps the sanitized address when switching search modes', () => {
    const { setSanitizedAddress, setSearchMode } = useTransactionHistoryAddressStore.getState();

    setSanitizedAddress(VALID_ADDRESS);
    setSearchMode('txHash');

    expect(useTransactionHistoryAddressStore.getState().sanitizedAddress).toBe(VALID_ADDRESS);
  });
});
