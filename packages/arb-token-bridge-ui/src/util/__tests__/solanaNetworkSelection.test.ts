import { afterAll, describe, expect, it, vi } from 'vitest';

import {
  lifiDestinationChainIds,
  lifiSourceOnlyChainIds,
} from '../../app/api/crosschain-transfers/constants';
import { isTransferExecutionAvailable } from '../../services/transferExecutionAvailability';
import { ChainId } from '../../types/ChainId';
import { defaultWalletContextValue } from '../../wallet/WalletContext';
import { getDestinationChainIds } from '../chainUtils';
import { getChainMetadata } from '../networkMetadata';
import { getDestinationChainIds as getSelectorDestinationChainIds, isNetwork } from '../networks';
import { decodeChainQueryParam, sanitizeQueryParams } from '../queryParamUtils';
import { getTxHistoryRoutes } from '../txHistoryRoutes';

vi.hoisted(() => vi.stubEnv('NEXT_PUBLIC_FEATURE_FLAG_SOLANA_ENABLED', 'true'));

afterAll(() => vi.unstubAllEnvs());

describe('enabled Solana network selection', () => {
  const destinations = [ChainId.ArbitrumOne, ChainId.ApeChain, ChainId.Superposition];
  it('registers only the three approved one-way pairs', () => {
    expect(lifiDestinationChainIds[ChainId.Solana]).toEqual(destinations);
    expect(lifiSourceOnlyChainIds.has(ChainId.Solana)).toBe(true);
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
  it('enables Solana submission with a connected wallet', () => {
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
    ).toBe(true);
  });
  it('classifies Solana history routes as mainnet', () => {
    const route = {
      parentChainId: ChainId.Solana,
      childChainId: ChainId.ArbitrumOne,
    };
    expect(isNetwork(ChainId.Solana).isTestnet).toBe(false);
    expect(getTxHistoryRoutes({ isTestnetMode: false })).toContainEqual(route);
    expect(getTxHistoryRoutes({ isTestnetMode: true })).not.toContainEqual(route);
  });
});
