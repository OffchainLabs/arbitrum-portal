import { ArrowDownIcon, ArrowRightIcon } from '@heroicons/react/24/solid';
import dayjs from 'dayjs';
import { BigNumber } from 'ethers';
import Image from 'next/image';
import { PropsWithChildren } from 'react';
import { twMerge } from 'tailwind-merge';

import LifiLogo from '@/icons/lifi.svg';
import ArbitrumLogo from '@/images/ArbitrumLogo.svg';
import CctpLogoColor from '@/images/CctpLogoColor.svg';
import EthereumLogoRoundLight from '@/images/EthereumLogoRoundLight.svg';
import LayerZeroIcon from '@/images/LayerZeroIcon.png';
import { getProviderForChainId } from '@/token-bridge-sdk/utils';

import { GET_HELP_LINK, ether } from '../../constants';
import { useETHPrice } from '../../hooks/useETHPrice';
import { useMode } from '../../hooks/useMode';
import { useNativeCurrency } from '../../hooks/useNativeCurrency';
import { LifiMergedTransaction, MergedTransaction } from '../../state/app/state';
import { isCustomDestinationAddressTx } from '../../state/app/utils';
import { addressesEqual } from '../../util/AddressUtils';
import { trackEvent } from '../../util/AnalyticsUtils';
import { shortenAddress } from '../../util/CommonUtils';
import {
  getLifiRouteToolDetails,
  getLifiToolDetails,
  getLifiTransactionSnapshot,
} from '../../util/LifiRouteUtils';
import { formatAmount, formatUSD } from '../../util/NumberUtils';
import { isBatchTransfer } from '../../util/TokenDepositUtils';
import { sanitizeTokenSymbol } from '../../util/TokenUtils';
import { getBridgeUiConfigForChain } from '../../util/bridgeUiConfig';
import { getExplorerUrl, getNetworkName, isNetwork } from '../../util/networks';
import { Button } from '../common/Button';
import { ExternalLink } from '../common/ExternalLink';
import { NetworkImage } from '../common/NetworkImage';
import { SafeImage } from '../common/SafeImage';
import { BatchTransferNativeTokenTooltip } from './TransactionHistoryTable';
import { TransactionsTableDetailsSteps } from './TransactionsTableDetailsSteps';
import { TransactionsTableTokenImage } from './TransactionsTableTokenImage';
import { getTransactionType, isLifiTransfer, isTxCompleted } from './helpers';

const ProtocolNameAndLogo = ({ tx }: { tx: MergedTransaction }) => {
  if (isLifiTransfer(tx)) {
    const toolDetails =
      getLifiTransactionSnapshot(tx)?.toolsDetails[0] ?? getLifiRouteToolDetails(tx.lifiRoute);

    return (
      <div className="flex flex-col gap-1">
        <div className="flex flex-row items-center gap-1">
          <SafeImage alt="Bridge logo" src={toolDetails.logoURI} width={30} height={30} />
          <span>{toolDetails.name}</span>
        </div>
        <div className="flex flex-row items-center gap-1">
          <Image alt="Lifi logo" src={LifiLogo} width={16} height={16} />
          <span>Bridged via LiFi</span>
        </div>
      </div>
    );
  }

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

const DetailsBox = ({ children, header }: PropsWithChildren<{ header?: string }>) => {
  return (
    <div className="flex w-full flex-col rounded border border-white/10 bg-white/5 p-3 font-light text-white">
      {header && <h4 className="mb-2 text-xs uppercase text-white/60">{header}</h4>}
      {children}
    </div>
  );
};

type LifiTokenFlowToken = {
  address?: string | null;
  chainId?: number;
  decimals: number;
  logoURI?: string | null;
  symbol: string;
};

type LifiTokenFlowItem =
  | {
      type: 'token';
      id: string;
      amount: string | undefined;
      amountUSD?: string;
      chainId: number;
      token: LifiTokenFlowToken;
    }
  | {
      type: 'tool';
      id: string;
      iconURI?: string;
      name: string;
    };

function getLifiTokenFlowItems(tx: LifiMergedTransaction): LifiTokenFlowItem[] {
  const steps = tx.lifiRoute?.steps ?? [];
  const firstStep = steps[0];
  const snapshot = getLifiTransactionSnapshot(tx);
  const userFacingTools = snapshot?.toolsDetails ?? [];

  if (!firstStep?.action || !firstStep.estimate || steps.length === 0) {
    if (!snapshot) {
      return [];
    }

    return [
      {
        type: 'token',
        id: 'source-token',
        amount: snapshot.fromAmount.amount.toString(),
        amountUSD: snapshot.fromAmount.amountUSD,
        chainId: tx.sourceChainId,
        token: snapshot.fromAmount.token,
      },
      {
        type: 'tool',
        id: snapshot.toolsDetails[0]!.key || snapshot.toolsDetails[0]!.name,
        iconURI: snapshot.toolsDetails[0]!.logoURI,
        name: snapshot.toolsDetails[0]!.name,
      },
      {
        type: 'token',
        id: 'destination-token',
        amount: snapshot.toAmount.amount.toString(),
        amountUSD: snapshot.toAmount.amountUSD,
        chainId: tx.destinationChainId,
        token: snapshot.toAmount.token,
      },
    ];
  }

  return steps.reduce<LifiTokenFlowItem[]>((items, step, stepIndex) => {
    const toolDetails =
      userFacingTools.find((tool) => tool.key === step.toolDetails.key) ??
      getLifiToolDetails(step.toolDetails);

    if (stepIndex === 0) {
      items.push({
        type: 'token',
        id: `${step.id || stepIndex}-source-token`,
        amount: step.action.fromAmount,
        amountUSD: step.estimate.fromAmountUSD,
        chainId: step.action.fromChainId,
        token: step.action.fromToken,
      });
    }

    items.push(
      {
        type: 'tool',
        id: `${step.id || stepIndex}-tool`,
        iconURI: toolDetails.logoURI,
        name: toolDetails.name,
      },
      {
        type: 'token',
        id: `${step.id || stepIndex}-destination-token`,
        amount: step.execution?.toAmount ?? step.estimate.toAmount,
        amountUSD: step.estimate.toAmountUSD,
        chainId: step.action.toChainId,
        token: step.execution?.toToken ?? step.action.toToken,
      },
    );

    return items;
  }, []);
}

function LifiNetworkLogo({ chainId }: { chainId: number }) {
  const { network } = getBridgeUiConfigForChain(chainId);
  const networkName = getNetworkName(chainId);

  return (
    <Image
      src={network.logo}
      alt={`${networkName} logo`}
      className="absolute left-4 top-0 h-6 w-6 rounded-full ring-2 ring-dark"
      width={24}
      height={24}
    />
  );
}

function LifiTokenWithNetworkIcon({
  chainId,
  token,
}: {
  chainId: number;
  token: LifiTokenFlowToken;
}) {
  return (
    <div className="relative h-6 w-10 shrink-0">
      <SafeImage
        alt={`${token.symbol} logo`}
        src={token.logoURI ?? undefined}
        width={24}
        height={24}
        className="absolute left-0 top-0 h-6 w-6 rounded-full"
        fallback={<div className="absolute left-0 top-0 h-6 w-6 rounded-full bg-white/20" />}
      />
      <LifiNetworkLogo chainId={chainId} />
    </div>
  );
}

function LifiTokenFlowRow({ item }: { item: Extract<LifiTokenFlowItem, { type: 'token' }> }) {
  const amount = item.amount
    ? formatAmount(BigNumber.from(item.amount), {
        decimals: item.token.decimals,
        symbol: item.token.symbol,
      })
    : '';
  const amountUSD =
    typeof item.amountUSD !== 'undefined' && Number(item.amountUSD) > 0
      ? formatUSD(Number(item.amountUSD)).replace(' USD', '')
      : null;

  return (
    <div className="flex items-center gap-3">
      <LifiTokenWithNetworkIcon chainId={item.chainId} token={item.token} />
      <span className="text-base text-white">
        {amount} ({getNetworkName(item.chainId)})
      </span>
      {amountUSD && <span className="text-base text-white/60">{amountUSD}</span>}
    </div>
  );
}

function LifiToolFlowRow({ item }: { item: Extract<LifiTokenFlowItem, { type: 'tool' }> }) {
  return (
    <div className="flex items-center gap-3 pl-[10px]">
      <ArrowDownIcon className="h-5 w-5 text-white" />
      <div className="flex items-center gap-3">
        <SafeImage
          alt={`${item.name} logo`}
          src={item.iconURI}
          width={16}
          height={16}
          className="h-4 w-4 rounded-full"
          fallback={<div className="h-4 w-4 rounded-full bg-white/20" />}
        />
        <span className="text-xs text-white/60">{item.name.toUpperCase()} (LiFi)</span>
      </div>
    </div>
  );
}

function LifiTokenFlowDetailsBox({ tx }: { tx: LifiMergedTransaction }) {
  const items = getLifiTokenFlowItems(tx);
  const stepsCount = items.filter((item) => item.type === 'tool').length;

  return (
    <DetailsBox header={stepsCount > 1 ? 'Tokens' : 'Token'}>
      <div className="flex flex-col gap-3">
        {items.map((item) =>
          item.type === 'token' ? (
            <LifiTokenFlowRow item={item} key={item.id} />
          ) : (
            <LifiToolFlowRow item={item} key={item.id} />
          ),
        )}
      </div>
    </DetailsBox>
  );
}

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

  const lifiSnapshot = isLifiTransfer(tx) ? getLifiTransactionSnapshot(tx) : undefined;
  const tokenSymbol = isLifiTransfer(tx)
    ? (lifiSnapshot?.fromAmount.token.symbol ?? tx.asset)
    : sanitizeTokenSymbol(tx.asset, {
        erc20L1Address: tx.tokenAddress,
        chainId: tx.sourceChainId,
      });
  const tokenLogoSrc = lifiSnapshot?.fromAmount.token.logoURI;

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

  const customAddressDetails = (isDifferentSourceAddress || isDifferentDestinationAddress) && (
    <DetailsBox header="Custom Address">
      {isDifferentSourceAddress && (
        <span className="text-xs">
          Funds received from{' '}
          <ExternalLink
            className="arb-hover underline"
            href={`${getExplorerUrl(sourceChainId)}/address/${tx.sender}`}
            aria-label={`Custom address: ${shortenAddress(String(tx.sender))}`}
          >
            {showFullCustomAddress ? String(tx.sender) : shortenAddress(String(tx.sender))}
          </ExternalLink>
        </span>
      )}
      {isDifferentDestinationAddress && (
        <span className="text-xs">
          Funds sent to{' '}
          <ExternalLink
            className="arb-hover underline"
            href={`${getExplorerUrl(destinationChainId)}/address/${tx.destination}`}
            aria-label={`Custom address: ${shortenAddress(String(tx.destination))}`}
          >
            {showFullCustomAddress
              ? String(tx.destination)
              : shortenAddress(String(tx.destination))}
          </ExternalLink>
        </span>
      )}
    </DetailsBox>
  );

  if (isLifiTransfer(tx)) {
    return (
      <div className={twMerge('grid gap-3', embedMode && 'min-[850px]:grid-cols-2')}>
        <DetailsBox>
          <div className="flex justify-between text-sm text-white">
            <span>{dayjs(tx.createdAt).format('MMMM D, YYYY')}</span>
            <span>{dayjs(tx.createdAt).format('h:mma')}</span>
          </div>
        </DetailsBox>

        <LifiTokenFlowDetailsBox tx={tx} />

        <DetailsBox header="Network">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <NetworkImage chainId={sourceChainId} className="h-6 w-6" />
              <span className="text-base">{sourceNetworkName}</span>
            </div>
            <ArrowRightIcon width={16} />
            <div className="flex items-center space-x-2">
              <NetworkImage chainId={destinationChainId} className="h-6 w-6" />
              <span className="text-base">{destinationNetworkName}</span>
            </div>
          </div>
        </DetailsBox>

        {customAddressDetails}

        <DetailsBox>
          <TransactionsTableDetailsSteps tx={tx} />
        </DetailsBox>
      </div>
    );
  }

  return (
    <div className={twMerge('grid gap-4', embedMode && 'min-[850px]:grid-cols-2')}>
      <DetailsBox>
        <div className="flex flex-col space-y-3">
          <div className="flex justify-between text-xs text-white">
            <span>{dayjs(tx.createdAt).format('MMMM DD, YYYY')}</span>
            <span>{dayjs(tx.createdAt).format('h:mma')}</span>
          </div>
          <div className="flex flex-col space-y-1">
            <div className="flex items-center space-x-2">
              {tokenLogoSrc ? (
                <SafeImage
                  alt={`${tokenSymbol} logo`}
                  src={tokenLogoSrc}
                  width={20}
                  height={20}
                  className="h-5 w-5"
                  fallback={<div className="h-5 w-5 rounded-full bg-white/20" />}
                />
              ) : (
                <TransactionsTableTokenImage tx={tx} />
              )}
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
      </DetailsBox>

      <DetailsBox header="Network">
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
      </DetailsBox>

      <DetailsBox header="Bridge">
        <ProtocolNameAndLogo tx={tx} />
      </DetailsBox>

      {customAddressDetails}

      <DetailsBox>
        <TransactionsTableDetailsSteps tx={tx} />
      </DetailsBox>

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
