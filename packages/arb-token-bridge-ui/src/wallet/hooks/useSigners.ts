import { useMemo } from 'react';

import { useNetworks } from '../../hooks/useNetworks';
import { ChainId } from '../../types/ChainId';
import { useEvmSignerContext } from '../providers/EvmSignerProvider';
import { useSolanaSignerContext } from '../providers/SolanaSignerProvider';
import type { SignerHandle } from '../types';

export function useSigners(): {
  sourceSigner: SignerHandle;
  destinationSigner: SignerHandle;
} {
  const [networks] = useNetworks();
  const evmSigner = useEvmSignerContext();
  const solanaSigner = useSolanaSignerContext();

  const sourceSigner = useMemo(
    () => (networks.sourceChain.id === ChainId.Solana ? solanaSigner : evmSigner),
    [evmSigner, networks.sourceChain.id, solanaSigner],
  );

  const destinationSigner = useMemo(
    () => (networks.destinationChain.id === ChainId.Solana ? solanaSigner : evmSigner),
    [evmSigner, networks.destinationChain.id, solanaSigner],
  );

  return {
    sourceSigner,
    destinationSigner,
  };
}
