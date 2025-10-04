import { useMemo } from 'react';
import { useAccount } from 'wagmi';

import { FETCH_SELECTED_NETWORK_TX_HISTORY_ONLY } from '../../constants';
import { useAccountType } from '../../hooks/useAccountType';
import { useBalance } from '../../hooks/useBalance';
import { useLifiTransactionHistory } from '../../hooks/useLifiTransactionHistory';
import { useNetworks } from '../../hooks/useNetworks';
import { ChainId } from '../../types/ChainId';
import { CommonAddress } from '../../util/CommonAddressUtils';
import { getBridgeUiConfigForChain } from '../../util/bridgeUiConfig';
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
  const { address: walletAddress } = useAccount();
  const { accountType } = useAccountType();
  const [networks] = useNetworks();
  const { data: lifiTransactions } = useLifiTransactionHistory({
    walletAddress,
  });

  const {
    erc20: [mainnetBalances],
  } = useBalance({
    chainId: ChainId.Ethereum,
    walletAddress,
  });
  const {
    erc20: [arbOneBalances],
  } = useBalance({
    chainId: ChainId.ArbitrumOne,
    walletAddress,
  });

  const showOftDisclaimer = useMemo(() => {
    const mainnetUsdtBalance = mainnetBalances?.[CommonAddress.Ethereum.USDT];
    const arbOneUsdtBalance = arbOneBalances?.[CommonAddress.ArbitrumOne.USDT];

    const userHasUsdtBalance =
      (mainnetUsdtBalance && mainnetUsdtBalance.gt(0)) ||
      (arbOneUsdtBalance && arbOneUsdtBalance.gt(0));

    return userHasUsdtBalance && accountType === 'smart-contract-wallet';
  }, [mainnetBalances, arbOneBalances, accountType]);

  const showLifiDisclaimer =
    accountType === 'smart-contract-wallet' || (lifiTransactions && lifiTransactions.length > 0);

  const showSelectedNetworkWarning = FETCH_SELECTED_NETWORK_TX_HISTORY_ONLY;
  const sourceNetworkName = getBridgeUiConfigForChain(networks.sourceChain.id).network.name;
  const destinationNetworkName = getBridgeUiConfigForChain(networks.destinationChain.id).network
    .name;

  if (!showOftDisclaimer && !showLifiDisclaimer && !showSelectedNetworkWarning) {
    return null;
  }

  return (
    <div
      className={'flex flex-col gap-2 rounded-md bg-blue/20 p-2 text-sm text-white'}
      id="tx-history-disclaimer"
    >
      {showSelectedNetworkWarning && (
        <p>
          Due to increased load, transaction history is only being shown for the network pair that
          you&apos;ve selected in the Bridge tab. ie.{' '}
          <span className="font-bold">{sourceNetworkName}</span> and{' '}
          <span className="font-bold">{destinationNetworkName}</span>. Please select other networks
          to view their transactions while our team works on a solution.
        </p>
      )}

      {!showSelectedNetworkWarning && (
        <>
          <span className="font-bold">Don&apos;t see your transaction?</span>
          <ul className="list-disc pl-4">
            {showLifiDisclaimer &&
              (lifiTransactions && lifiTransactions.length > 0 ? (
                <li>
                  LiFi transactions can be found on{' '}
                  <ExternalLink
                    href={
                      walletAddress
                        ? `https://scan.li.fi/wallet/${walletAddress}`
                        : 'https://scan.li.fi'
                    }
                    className="arb-hover inline-flex underline"
                  >
                    LifiScanner
                  </ExternalLink>
                  .
                </li>
              ) : (
                <li>
                  LiFi transactions inititated by Smart-contract wallets can be found on{' '}
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
              ))}
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
        </>
      )}
    </div>
  );
}
