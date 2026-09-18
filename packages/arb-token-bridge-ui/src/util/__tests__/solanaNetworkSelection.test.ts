import { describe, expect, it, vi } from 'vitest';

import { getSourceNativeCurrencyChainId } from '../../services/nativeCurrency';
import { isTransferExecutionAvailable } from '../../services/transferExecutionAvailability';
import { ChainId } from '../../types/ChainId';
import { defaultWalletContextValue } from '../../wallet/WalletContext';
import { additionalLifiDestinationChainIds } from '../../wallet/networks/solana';
import { getDestinationChainIds } from '../chainUtils';
import { getChainMetadata } from '../networkMetadata';
import { getDestinationChainIds as getSelectorDestinationChainIds } from '../networks';
import { decodeChainQueryParam, sanitizeQueryParams } from '../queryParamUtils';

vi.mock('@bridge-networks', async () => import('../../wallet/networks/solana'));

describe('enabled Solana network selection', () => {
  const destinations = [ChainId.ArbitrumOne, ChainId.ApeChain, ChainId.Superposition];
  it('registers only the three approved one-way pairs', () => {
    expect(additionalLifiDestinationChainIds[ChainId.Solana]).toEqual(destinations);
    expect(
      getSelectorDestinationChainIds(ChainId.Solana, { includeLifiEnabledChainPairs: true }),
    ).toEqual(destinations);
    expect(getDestinationChainIds(ChainId.Solana, { includeLifiEnabledChainPairs: true })).toEqual(
      destinations,
    );
    expect(getDestinationChainIds(ChainId.Solana)).toEqual([]);
    for (const destination of destinations) {
      expect(
        getDestinationChainIds(destination, { includeLifiEnabledChainPairs: true }),
      ).not.toContain(ChainId.Solana);
    }
  });
  it.each(destinations)('restores Solana to %s and resolves its metadata', (destinationChainId) => {
    expect(
      sanitizeQueryParams({
        sourceChainId: ChainId.Solana,
        destinationChainId,
        includeLifiEnabledChainPairs: true,
      }),
    ).toEqual({ sourceChainId: ChainId.Solana, destinationChainId });
    expect(getChainMetadata(destinationChainId).name).not.toBe('Unknown');
    expect(getSourceNativeCurrencyChainId(ChainId.Solana, destinationChainId)).toBe(ChainId.Solana);
  });
  it('rejects unsupported destinations and reverse URLs', () => {
    expect(
      sanitizeQueryParams({
        sourceChainId: ChainId.Solana,
        destinationChainId: ChainId.Base,
        includeLifiEnabledChainPairs: true,
      }),
    ).toEqual({ sourceChainId: ChainId.Solana, destinationChainId: ChainId.ArbitrumOne });
    for (const sourceChainId of [undefined, ChainId.Ethereum, ...destinations]) {
      expect(
        sanitizeQueryParams({
          sourceChainId,
          destinationChainId: ChainId.Solana,
          includeLifiEnabledChainPairs: true,
        }).destinationChainId,
      ).not.toBe(ChainId.Solana);
    }
  });
  it('decodes enabled URL slugs and numeric IDs', () => {
    expect(decodeChainQueryParam('solana')).toBe(ChainId.Solana);
    expect(decodeChainQueryParam(String(ChainId.Solana))).toBe(ChainId.Solana);
    expect(decodeChainQueryParam('superposition')).toBe(ChainId.Superposition);
  });
  it('keeps Solana submission unavailable even with a connected wallet', () => {
    expect(
      isTransferExecutionAvailable({
        chainId: ChainId.Solana,
        wallet: {
          ...defaultWalletContextValue.solana,
          isConnected: true,
          account: {
            ecosystem: 'solana',
            status: 'connected',
            address: 'Hgw1pNJDYm5NbMheUHFNniiqtncor73swrH4RSN9APu5',
          },
        },
      }),
    ).toBe(false);
  });
});
