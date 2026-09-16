import { useMemo } from 'react';

import { useAccountType } from '../../hooks/useAccountType';
import { ChainId } from '../../types/ChainId';
import { CommonAddress } from '../../util/CommonAddressUtils';
import { useTokenBalances } from '../../wallet/hooks/useTokenBalances';
import { useWallets } from '../../wallet/hooks/useWallets';
import { ExternalLink } from '../common/ExternalLink';

export const highlightTransactionHistoryDisclaimer = () => {
  const element = document.getElementById('tx-history-disclaimer');
  if (!element) return;

  element.classList.add('animate-blink', 'bg-highlight');

  // Remove highlight effect after 3 seconds
  setTimeout(() => {
    element.classList.remove('animate-blink', 'bg-highlight');
  }, 3000);
};

export function TransactionHistoryDisclaimer() {
  const { sourceWallet } = useWallets();
  const walletAddress = sourceWallet.ecosystem === 'evm' ? sourceWallet.account.address : undefined;
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

  if (!showOftDisclaimer && !showLifiDisclaimer) {
    return null;
  }

  return (
    <div
      className="flex flex-col gap-2 rounded-md bg-bright-blue/20 p-2 text-sm text-white"
      id="tx-history-disclaimer"
    >
      <span className="font-bold">Don&apos;t see your transaction?</span>
      <ul className="list-disc pl-4">
        {showLifiDisclaimer && (
          <li>
            LiFi transactions initiated by Smart-contract wallets can be found on{' '}
            <ExternalLink
              href={
                walletAddress
                  ? `https://arbiscan.io/address/${walletAddress}`
                  : 'https://arbiscan.io'
              }
              className="arb-hover inline-flex underline"
            >
              Arbiscan
            </ExternalLink>
            .
          </li>
        )}
        {showOftDisclaimer && (
          <li>
            LayerZero USDT transfers initiated by Smart-contract wallets can be found on{' '}
            <ExternalLink
              href={
                walletAddress
                  ? `https://etherscan.io/address/${walletAddress}`
                  : 'https://etherscan.io'
              }
            >
              Etherscan
            </ExternalLink>{' '}
            and{' '}
            <ExternalLink
              href={
                walletAddress
                  ? `https://arbiscan.io/address/${walletAddress}`
                  : 'https://arbiscan.io'
              }
            >
              Arbiscan
            </ExternalLink>
            .
          </li>
        )}
      </ul>
      <span className="pl-4">Full integration of transactions history is coming soon.</span>
    </div>
  );
}
