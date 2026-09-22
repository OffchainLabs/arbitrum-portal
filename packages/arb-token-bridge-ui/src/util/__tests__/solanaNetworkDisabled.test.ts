import { afterAll, describe, expect, it, vi } from 'vitest';

import {
  lifiDestinationChainIds,
  lifiSourceOnlyChainIds,
} from '../../app/api/crosschain-transfers/constants';
import { isTransferExecutionAvailable } from '../../services/transferExecutionAvailability';
import { ChainId } from '../../types/ChainId';
import { defaultWalletContextValue } from '../../wallet/WalletContext';
import { getDestinationChainIds, isSupportedChainId } from '../chainUtils';
import { decodeChainQueryParam, sanitizeQueryParams } from '../queryParamUtils';

vi.hoisted(() => vi.stubEnv('NEXT_PUBLIC_FEATURE_FLAG_SOLANA_ENABLED', 'false'));

afterAll(() => vi.unstubAllEnvs());

describe('disabled Solana network selection', () => {
  it('excludes Solana from selectors and restored URLs', () => {
    expect(lifiDestinationChainIds[ChainId.Solana]).toBeUndefined();
    expect(lifiSourceOnlyChainIds.has(ChainId.Solana)).toBe(false);
    expect(isSupportedChainId(ChainId.Solana)).toBe(false);
    expect(decodeChainQueryParam('solana')).toBeUndefined();
    expect(decodeChainQueryParam(String(ChainId.Solana))).toBeUndefined();
    expect(getDestinationChainIds(ChainId.Solana, { includeLifiEnabledChainPairs: true })).toEqual(
      [],
    );
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
    expect(
      sanitizeQueryParams({
        sourceChainId: ChainId.Solana,
        destinationChainId: ChainId.ArbitrumOne,
        includeLifiEnabledChainPairs: false,
      }),
    ).toEqual({ sourceChainId: ChainId.Ethereum, destinationChainId: ChainId.ArbitrumOne });
  });
});
