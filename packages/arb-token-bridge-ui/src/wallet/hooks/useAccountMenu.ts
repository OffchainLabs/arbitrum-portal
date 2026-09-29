import { JsonRpcProvider } from '@ethersproject/providers';
import Resolution from '@unstoppabledomains/resolution';
import { useEffect, useMemo, useState } from 'react';
import { isAddress } from 'viem';
import { useEnsAvatar, useEnsName } from 'wagmi';

import { getProviderForChainId } from '@/token-bridge-sdk/utils';

import { useArbQueryParams } from '../../hooks/useArbQueryParams';
import { useNetworks } from '../../hooks/useNetworks';
import { ChainId } from '../../types/ChainId';
import { shortenAddress } from '../../util/CommonUtils';
import { getChainMetadata } from '../../util/networkMetadata';
import { useWalletModal } from './useWalletModal';
import { useWalletForChain } from './useWallets';

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

export const useAccountMenu = (chainId?: number) => {
  const [networks] = useNetworks();
  const selectedChainId = chainId ?? networks.sourceChain.id;
  const wallet = useWalletForChain(selectedChainId);
  const { address } = wallet.account;
  const evmAddress = address && isAddress(address) ? address : undefined;
  const chain = getChainMetadata(selectedChainId);
  const { openConnectModal } = useWalletModal(selectedChainId);

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
    const resolveUdName = async () => {
      const udName = await tryLookupUDName(getProviderForChainId(ChainId.Ethereum), evmAddress);

      setUDInfo({ name: udName });
    };
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
    const resolveUdName = async () => {
      const udName = await tryLookupUDName(getProviderForChainId(ChainId.Ethereum), evmAddress);

      setUDInfo({ name: udName });
    };
    resolveUdName();
  }, [evmAddress]);

  return {
    address,
    accountShort,
    ensName: evmAddress ? ensName : undefined,
    ensAvatar: evmAddress ? ensAvatar : wallet.account.walletInfo?.icon,
    udInfo: evmAddress ? udInfo : udInfoDefaults,
    isConnected: wallet.isConnected,
    disconnect: wallet.disconnect,
    openConnectModal,
    chain,
    setQueryParams,
  };
};
