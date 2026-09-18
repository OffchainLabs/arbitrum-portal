import { useHistoryDisclaimer } from '../../hooks/useHistoryDisclaimer';
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
  const { showOftDisclaimer, showLifiDisclaimer, arbiscanUrl, etherscanUrl } =
    useHistoryDisclaimer();

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
            <ExternalLink href={arbiscanUrl} className="arb-hover inline-flex underline">
              Arbiscan
            </ExternalLink>
            .
          </li>
        )}
        {showOftDisclaimer && (
          <li>
            LayerZero USDT transfers initiated by Smart-contract wallets can be found on{' '}
            <ExternalLink href={etherscanUrl}>Etherscan</ExternalLink> and{' '}
            <ExternalLink href={arbiscanUrl}>Arbiscan</ExternalLink>.
          </li>
        )}
      </ul>
      <span className="pl-4">Full integration of transactions history is coming soon.</span>
    </div>
  );
}
