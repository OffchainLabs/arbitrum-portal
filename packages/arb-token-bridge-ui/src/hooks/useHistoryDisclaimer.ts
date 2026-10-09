import { useMemo } from 'react';

import { getHistoryDisclaimerAddress } from '../services/history';
import { ChainId } from '../types/ChainId';
import { CommonAddress } from '../util/CommonAddressUtils';
import { useTokenBalances } from '../wallet/hooks/useTokenBalances';
import { useWallets } from '../wallet/hooks/useWallets';
import { useAccountType } from './useAccountType';

export function useHistoryDisclaimer() {
  const { sourceWallet } = useWallets();
  const walletAddress = getHistoryDisclaimerAddress(sourceWallet);
  const { accountType } = useAccountType(walletAddress ?? '');

  const { data: mainnetBalances } = useTokenBalances({
    chainId: ChainId.Ethereum,
    walletAddress,
    tokenAddresses: [CommonAddress.Ethereum.USDT],
  });
  const { data: arbOneBalances } = useTokenBalances({
    chainId: ChainId.ArbitrumOne,
    walletAddress,
    tokenAddresses: [CommonAddress.ArbitrumOne.USDT],
  });

  const showOftDisclaimer = useMemo(() => {
    const mainnetUsdtBalance = mainnetBalances?.[CommonAddress.Ethereum.USDT];
    const arbOneUsdtBalance = arbOneBalances?.[CommonAddress.ArbitrumOne.USDT];

    const userHasUsdtBalance =
      (mainnetUsdtBalance !== undefined && mainnetUsdtBalance > 0n) ||
      (arbOneUsdtBalance !== undefined && arbOneUsdtBalance > 0n);

    return userHasUsdtBalance && accountType === 'smart-contract-wallet';
  }, [mainnetBalances, arbOneBalances, accountType]);

  const showLifiDisclaimer = accountType === 'smart-contract-wallet';

  return {
    showOftDisclaimer,
    showLifiDisclaimer,
    arbiscanUrl: walletAddress
      ? `https://arbiscan.io/address/${walletAddress}`
      : 'https://arbiscan.io',
    etherscanUrl: walletAddress
      ? `https://etherscan.io/address/${walletAddress}`
      : 'https://etherscan.io',
  };
}
