import { JsonRpcProvider } from '@ethersproject/providers';
import Resolution from '@unstoppabledomains/resolution';
import { useEffect, useMemo, useState } from 'react';
import { useEnsAvatar, useEnsName } from 'wagmi';

import { getProviderForChainId } from '@/token-bridge-sdk/utils';

import { ChainId } from '../types/ChainId';
import { shortenAddress } from '../util/CommonUtils';
import { useWallets } from '../wallet/hooks/useWallets';
import { useArbQueryParams } from './useArbQueryParams';

type UDInfo = { name: string | null };
const udInfoDefaults: UDInfo = { name: null };

async function tryLookupUDName(provider: JsonRpcProvider, address: string) {
  const UDresolution = Resolution.fromEthersProvider({
    uns: {
      // TODO => remove Layer2 config when UD lib supports our use case
      // Layer2 (polygon) is required in the object type but we only want to use Layer1
      // This is a hack to only support Ethereum Mainnet UD names
      // https://github.com/unstoppabledomains/resolution/issues/229
      locations: {
        Layer1: {
          network: 'mainnet',
          provider,
        },
        Layer2: {
          network: 'mainnet',
          provider,
        },
      },
    },
  });
  try {
    return await UDresolution.reverse(address);
  } catch (error) {
    return null;
  }
}

export const useAccountMenu = () => {
  const { sourceWallet } = useWallets();
  const { address, chain, ecosystem } = sourceWallet.account;

  const [, setQueryParams] = useArbQueryParams();

  const [udInfo, setUDInfo] = useState<UDInfo>(udInfoDefaults);
  const { data: ensName } = useEnsName({
    address: ecosystem === 'evm' ? (address as `0x${string}`) : undefined,
    chainId: ChainId.Ethereum,
  });

  const { data: ensAvatar } = useEnsAvatar({
    name: ecosystem === 'evm' ? (ensName ?? '') : '',
    chainId: ChainId.Ethereum,
  });

  useEffect(() => {
    if (!address || ecosystem !== 'evm') {
      setUDInfo(udInfoDefaults);
      return;
    }

    async function resolveUdName() {
      const udName = await tryLookupUDName(
        getProviderForChainId(ChainId.Ethereum),
        address as string,
      );

      setUDInfo({ name: udName });
    }
    resolveUdName();
  }, [address, ecosystem]);

  const accountShort = useMemo(() => {
    if (typeof address === 'undefined') {
      return '';
    }

    return shortenAddress(address);
  }, [address]);

  return {
    address,
    accountShort,
    ensName,
    ensAvatar,
    udInfo,
    chain,
    setQueryParams,
  };
};
