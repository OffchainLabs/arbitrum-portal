import { JsonRpcProvider } from '@ethersproject/providers';
import Resolution from '@unstoppabledomains/resolution';
import { useEffect, useMemo, useState } from 'react';
import { useEnsAvatar, useEnsName } from 'wagmi';

import { getProviderForChainId } from '@/token-bridge-sdk/utils';

import { ChainId } from '../types/ChainId';
import { shortenAddress } from '../util/CommonUtils';
import { useWallets } from '../wallet/hooks/useWallets';
import type { WalletHandle } from '../wallet/types';
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

/** Account details of `wallet`, or of the source wallet by default */
export const useAccountMenu = (wallet?: WalletHandle) => {
  const { sourceWallet } = useWallets();
  const selectedWallet = wallet ?? sourceWallet;
  const { address } = selectedWallet.account;
  // ENS and Unstoppable Domains only resolve EVM addresses
  const evmAddress =
    selectedWallet.ecosystem === 'evm' ? selectedWallet.account.address : undefined;

  const [, setQueryParams] = useArbQueryParams();

  const [udInfo, setUDInfo] = useState<UDInfo>(udInfoDefaults);
  const { data: ensName } = useEnsName({
    address: evmAddress,
    chainId: ChainId.Ethereum,
  });

  const { data: ensAvatar } = useEnsAvatar({
    name: ensName ?? '',
    chainId: ChainId.Ethereum,
  });

  useEffect(() => {
    if (!evmAddress) return;
    async function resolveUdName() {
      const udName = await tryLookupUDName(
        getProviderForChainId(ChainId.Ethereum),
        evmAddress as string,
      );

      setUDInfo({ name: udName });
    }
    resolveUdName();
  }, [evmAddress]);

  const accountShort = useMemo(() => {
    if (typeof address === 'undefined') {
      return '';
    }

    return shortenAddress(address);
  }, [address]);

  useEffect(() => {
    if (!evmAddress) return;
    async function resolveUdName() {
      const udName = await tryLookupUDName(
        getProviderForChainId(ChainId.Ethereum),
        evmAddress as string,
      );

      setUDInfo({ name: udName });
    }
    resolveUdName();
  }, [evmAddress]);

  return {
    address,
    accountShort,
    ensName,
    ensAvatar,
    udInfo: evmAddress ? udInfo : udInfoDefaults,
    setQueryParams,
  };
};
