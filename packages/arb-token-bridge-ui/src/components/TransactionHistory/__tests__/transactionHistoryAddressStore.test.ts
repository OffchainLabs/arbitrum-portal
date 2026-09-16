import bs58 from 'bs58';
import { utils } from 'ethers';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  TransactionHistorySearchError,
  useTransactionHistoryAddressStore,
} from '../TransactionHistorySearchBar';

const flags = vi.hoisted(() => ({ solana: true }));
vi.mock('../../../util/featureFlag', async (actual) => ({
  ...(await actual<typeof import('../../../util/featureFlag')>()),
  isSolanaEnabled: () => flags.solana,
}));

const VALID_ADDRESS = '0x1111111111111111111111111111111111111111';
const VALID_SOLANA_ADDRESS = 'So11111111111111111111111111111111111111112';
const VALID_TX_HASH = '0x94e3f5f7ae10d9b98df828b7bfa3b7b1c7f0e2a1b4b28ee1cf2a4dbecdd6bbf1';

describe.sequential('useTransactionHistoryAddressStore', () => {
  beforeEach(() => {
    flags.solana = true;
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

  it.each([
    '0x8ba1f109551bD432803012645Ac136ddd64DBA72',
    '8ba1f109551bD432803012645Ac136ddd64DBA72',
    utils.getIcapAddress('0x8ba1f109551bD432803012645Ac136ddd64DBA72'),
  ])('canonicalizes EVM search input %s', (address) => {
    useTransactionHistoryAddressStore.getState().setSanitizedAddress(address);
    expect(useTransactionHistoryAddressStore.getState().sanitizedAddress).toBe(
      '0x8ba1f109551bd432803012645ac136ddd64dba72',
    );
  });

  it('rejects an EVM address with an invalid checksum', () => {
    useTransactionHistoryAddressStore
      .getState()
      .setSanitizedAddress('0x8ba1f109551bD432803012645Ac136ddd64DBA73');
    expect(useTransactionHistoryAddressStore.getState().sanitizedAddress).toBeUndefined();
  });

  it('accepts a Solana address without changing its case', () => {
    const { setSanitizedAddress } = useTransactionHistoryAddressStore.getState();

    setSanitizedAddress(VALID_SOLANA_ADDRESS);

    expect(useTransactionHistoryAddressStore.getState().sanitizedAddress).toBe(
      VALID_SOLANA_ADDRESS,
    );
  });

  it('preserves a Solana key that also matches unprefixed EVM hex', () => {
    const address = '1'.repeat(10) + 'A'.repeat(30);
    useTransactionHistoryAddressStore.getState().setSanitizedAddress(address);
    expect(useTransactionHistoryAddressStore.getState().sanitizedAddress).toBe(address);
  });

  it('rejects Solana search with the flag off while keeping EVM search available', () => {
    flags.solana = false;
    const { setSanitizedAddress } = useTransactionHistoryAddressStore.getState();
    setSanitizedAddress(VALID_SOLANA_ADDRESS);
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
  it('accepts a Solana signature without changing its case', () => {
    const signature = bs58.encode(Uint8Array.from({ length: 64 }, (_, index) => index + 1));
    useTransactionHistoryAddressStore.getState().setSanitizedTxHash(signature);
    expect(useTransactionHistoryAddressStore.getState().sanitizedTxHash).toBe(signature);
  });
});
