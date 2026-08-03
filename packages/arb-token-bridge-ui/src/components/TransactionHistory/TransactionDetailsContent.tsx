import { ArrowRightIcon } from '@heroicons/react/24/solid';
import dayjs from 'dayjs';
import Image from 'next/image';
import { twMerge } from 'tailwind-merge';

import ArbitrumLogo from '@/images/ArbitrumLogo.svg';
import CctpLogoColor from '@/images/CctpLogoColor.svg';
import EthereumLogoRoundLight from '@/images/EthereumLogoRoundLight.svg';
import LayerZeroIcon from '@/images/LayerZeroIcon.png';
import { getProviderForChainId } from '@/token-bridge-sdk/utils';

import { GET_HELP_LINK, ether } from '../../constants';
import { useETHPrice } from '../../hooks/useETHPrice';
import { useMode } from '../../hooks/useMode';
import { useNativeCurrency } from '../../hooks/useNativeCurrency';
import { MergedTransaction } from '../../state/app/state';
import { isCustomDestinationAddressTx } from '../../state/app/utils';
import { addressesEqual } from '../../util/AddressUtils';
import { trackEvent } from '../../util/AnalyticsUtils';
import { shortenAddress } from '../../util/CommonUtils';
import { formatAmount, formatUSD } from '../../util/NumberUtils';
import { isBatchTransfer } from '../../util/TokenDepositUtils';
import { sanitizeTokenSymbol } from '../../util/TokenUtils';
import { getExplorerUrl, getNetworkName, isNetwork } from '../../util/networks';
import { Button } from '../common/Button';
import { ExternalLink } from '../common/ExternalLink';
import { NetworkImage } from '../common/NetworkImage';
import { LifiTransactionDetails } from './LifiTransactionDetails';
import { TransactionDetailsBox } from './TransactionDetailsBox';
import { BatchTransferNativeTokenTooltip } from './TransactionHistoryTable';
import { TransactionsTableDetailsSteps } from './TransactionsTableDetailsSteps';
import { TransactionsTableTokenImage } from './TransactionsTableTokenImage';
import { getTransactionType, isLifiTransfer, isTxCompleted } from './helpers';

const ProtocolNameAndLogo = ({ tx }: { tx: MergedTransaction }) => {
  let protocolLogo, protocolName, protocolDescription;

  if (tx.isOft) {
    protocolLogo = LayerZeroIcon;
    protocolName = 'LayerZero OFT';
    protocolDescription = '(Omnichain Fungible Token)';
  } else if (tx.isCctp) {
    protocolLogo = CctpLogoColor;
    protocolName = 'CCTP';
    protocolDescription = '(Cross-Chain Transfer Protocol)';
  } else {
    protocolLogo = ArbitrumLogo;
    protocolName = "Arbitrum's native bridge";
    protocolDescription = '';
  }

  return (
    <div className="flex items-center space-x-2">
      <Image
        alt="Bridge logo"
        className="h-4 w-4 shrink-0"
        src={protocolLogo}
        width={16}
        height={16}
      />

      <span>
        {protocolName}{' '}
        {protocolDescription && <span className="text-white/70">{protocolDescription}</span>}
      </span>
    </div>
  );
};

interface TransactionDetailsContentProps {
  tx: MergedTransaction;
  walletAddress?: string;
}

export const TransactionDetailsContent = ({
  tx,
  walletAddress,
}: TransactionDetailsContentProps) => {
  const { ethToUSD } = useETHPrice();
  const childProvider = getProviderForChainId(tx?.childChainId ?? 0);
  const nativeCurrency = useNativeCurrency({ provider: childProvider });

  const { embedMode } = useMode();

  if (!tx || !nativeCurrency) {
    return null;
  }

  const tokenSymbol = sanitizeTokenSymbol(tx.asset, {
    erc20L1Address: tx.tokenAddress,
    chainId: tx.sourceChainId,
  });

  const showPriceInUsd = !isNetwork(tx.parentChainId).isTestnet && tx.asset === ether.symbol;

  const isDifferentSourceAddress = walletAddress
    ? !addressesEqual(walletAddress, tx.sender)
    : false;
  const isDifferentDestinationAddress = isCustomDestinationAddressTx({
    sender: walletAddress,
    destination: tx.destination,
  });

  const { sourceChainId, destinationChainId } = tx;

  const sourceNetworkName = getNetworkName(sourceChainId);
  const destinationNetworkName = getNetworkName(destinationChainId);
  const showFullCustomAddress = isLifiTransfer(tx);
  const customSourceAddress = isDifferentSourceAddress ? tx.sender : undefined;
  const customDestinationAddress = isDifferentDestinationAddress ? tx.destination : undefined;

  const customAddressDetails = (isDifferentSourceAddress || isDifferentDestinationAddress) && (
    <TransactionDetailsBox header="Custom Address">
      {customSourceAddress && (
        <span className="text-xs">
          Funds received from{' '}
          <ExternalLink
            className="arb-hover underline"
            href={`${getExplorerUrl(sourceChainId)}/address/${customSourceAddress}`}
            aria-label={`Custom address: ${shortenAddress(customSourceAddress)}`}
          >
            {showFullCustomAddress ? customSourceAddress : shortenAddress(customSourceAddress)}
          </ExternalLink>
        </span>
      )}
      {customDestinationAddress && (
        <span className="text-xs">
          Funds sent to{' '}
          <ExternalLink
            className="arb-hover underline"
            href={`${getExplorerUrl(destinationChainId)}/address/${customDestinationAddress}`}
            aria-label={`Custom address: ${shortenAddress(customDestinationAddress)}`}
          >
            {showFullCustomAddress
              ? customDestinationAddress
              : shortenAddress(customDestinationAddress)}
          </ExternalLink>
        </span>
      )}
    </TransactionDetailsBox>
  );

  if (isLifiTransfer(tx)) {
    return (
      <LifiTransactionDetails
        tx={tx}
        embedMode={embedMode}
        customAddressDetails={customAddressDetails}
      />
    );
  }

  return (
    <div className={twMerge('grid gap-4', embedMode && 'min-[850px]:grid-cols-2')}>
      <TransactionDetailsBox>
        <div className="flex flex-col space-y-3">
          <div className="flex justify-between text-xs text-white">
            <span>{dayjs(tx.createdAt).format('MMMM DD, YYYY')}</span>
            <span>{dayjs(tx.createdAt).format('h:mma')}</span>
          </div>
          <div className="flex flex-col space-y-1">
            <div className="flex items-center space-x-2">
              <TransactionsTableTokenImage tx={tx} />
              <span>
                {formatAmount(Number(tx.value), {
                  symbol: tokenSymbol,
                })}
              </span>
              {showPriceInUsd && (
                <span className="text-white/70">{formatUSD(ethToUSD(Number(tx.value)))}</span>
              )}
            </div>
            {isBatchTransfer(tx) && (
              <BatchTransferNativeTokenTooltip tx={tx}>
                <div className="flex items-center space-x-2">
                  <Image
                    height={20}
                    width={20}
                    alt={`${nativeCurrency.symbol} logo`}
                    src={nativeCurrency.logoUrl ?? EthereumLogoRoundLight}
                  />
                  <span className="ml-2">
                    {formatAmount(Number(tx.value2), {
                      symbol: nativeCurrency.symbol,
                    })}
                  </span>
                  {isNetwork(tx.sourceChainId).isEthereumMainnet && (
                    <span className="text-white/70">{formatUSD(ethToUSD(Number(tx.value2)))}</span>
                  )}
                </div>
              </BatchTransferNativeTokenTooltip>
            )}
          </div>
        </div>
      </TransactionDetailsBox>

      <TransactionDetailsBox header="Network">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <NetworkImage chainId={sourceChainId} className="h-5 w-5" />
            <span>{sourceNetworkName}</span>
          </div>
          <ArrowRightIcon width={16} />
          <div className="flex items-center space-x-2">
            <NetworkImage chainId={destinationChainId} className="h-5 w-5" />
            <span>{destinationNetworkName}</span>
          </div>
        </div>
      </TransactionDetailsBox>

      <TransactionDetailsBox header="Bridge">
        <ProtocolNameAndLogo tx={tx} />
      </TransactionDetailsBox>

      {customAddressDetails}

      <TransactionDetailsBox>
        <TransactionsTableDetailsSteps tx={tx} />
      </TransactionDetailsBox>

      {!isTxCompleted(tx) && (
        <div className="flex justify-end">
          <ExternalLink href={GET_HELP_LINK}>
            <Button
              variant="secondary"
              className="border-white/30 text-xs"
              onClick={() => {
                trackEvent('Tx Error: Get Help Click', {
                  network: getNetworkName(tx.sourceChainId),
                  transactionType: getTransactionType(tx),
                });
              }}
            >
              Get help
            </Button>
          </ExternalLink>
        </div>
      )}
    </div>
  );
};
