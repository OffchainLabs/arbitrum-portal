import { ArrowDownIcon, ArrowRightIcon } from '@heroicons/react/24/solid';
import dayjs from 'dayjs';
import { BigNumber } from 'ethers';
import Image from 'next/image';
import { ReactNode } from 'react';
import { twMerge } from 'tailwind-merge';

import type { Token } from '../../app/api/crosschain-transfers/types';
import { LifiMergedTransaction } from '../../state/app/state';
import { getLifiToolDetails, getLifiTransactionSnapshot } from '../../util/LifiRouteUtils';
import { formatAmount, formatUSD } from '../../util/NumberUtils';
import { getBridgeUiConfigForChain } from '../../util/bridgeUiConfig';
import { getNetworkName } from '../../util/networks';
import { NetworkImage } from '../common/NetworkImage';
import { SafeImage } from '../common/SafeImage';
import { TransactionDetailsBox } from './TransactionDetailsBox';
import { TransactionsTableDetailsSteps } from './TransactionsTableDetailsSteps';

type LifiTokenFlowItem =
  | {
      type: 'token';
      id: string;
      amount: string;
      amountUSD?: string;
      chainId: number;
      token: Token;
    }
  | {
      type: 'tool';
      id: string;
      iconURI?: string;
      name: string;
    };

function getLifiTokenFlowItems(tx: LifiMergedTransaction): LifiTokenFlowItem[] {
  const snapshot = getLifiTransactionSnapshot(tx);

  if (!snapshot) {
    return [];
  }

  const sourceItem: LifiTokenFlowItem = {
    type: 'token',
    id: 'source-token',
    amount: snapshot.fromAmount.amount,
    amountUSD: snapshot.fromAmount.amountUSD,
    chainId: snapshot.fromAmount.chainId ?? tx.sourceChainId,
    token: snapshot.fromAmount.token,
  };

  const historySteps = tx.lifiRouteSteps?.map((step) => ({
    id: step.id,
    ...step.display,
  }));
  const routeSteps = tx.lifiRoute?.steps.map((step) => {
    const toolDetails =
      snapshot.toolsDetails.find((tool) => tool.key === step.toolDetails.key) ??
      getLifiToolDetails(step.toolDetails);

    return {
      id: step.id,
      toolDetails,
      toAmount: {
        amount: step.execution?.toAmount ?? step.estimate.toAmount,
        amountUSD: step.estimate.toAmountUSD,
        chainId: step.action.toChainId,
        token: step.execution?.toToken ?? step.action.toToken,
      },
    };
  });
  const steps = historySteps?.length ? historySteps : (routeSteps ?? []);

  if (steps.length === 0) {
    const tool = snapshot.toolsDetails[0];
    return [
      sourceItem,
      {
        type: 'tool',
        id: tool.key,
        iconURI: tool.logoURI,
        name: tool.name,
      },
      {
        type: 'token',
        id: 'destination-token',
        amount: snapshot.toAmount.amount,
        amountUSD: snapshot.toAmount.amountUSD,
        chainId: snapshot.toAmount.chainId ?? tx.destinationChainId,
        token: snapshot.toAmount.token,
      },
    ];
  }

  return steps.reduce<LifiTokenFlowItem[]>(
    (items, step) => {
      items.push(
        {
          type: 'tool',
          id: `${step.id}-tool`,
          iconURI: step.toolDetails.logoURI,
          name: step.toolDetails.name,
        },
        {
          type: 'token',
          id: `${step.id}-destination-token`,
          amount: step.toAmount.amount,
          amountUSD: step.toAmount.amountUSD,
          chainId: step.toAmount.chainId ?? tx.destinationChainId,
          token: step.toAmount.token,
        },
      );

      return items;
    },
    [sourceItem],
  );
}

function LifiNetworkLogo({ chainId }: { chainId: number }) {
  const { network } = getBridgeUiConfigForChain(chainId);

  return (
    <Image
      src={network.logo}
      alt={`${getNetworkName(chainId)} logo`}
      className="absolute left-4 top-0 h-6 w-6 rounded-full ring-2 ring-dark"
      width={24}
      height={24}
    />
  );
}

function LifiTokenFlowRow({ item }: { item: Extract<LifiTokenFlowItem, { type: 'token' }> }) {
  const amount = formatAmount(BigNumber.from(item.amount), {
    decimals: item.token.decimals,
    symbol: item.token.symbol,
  });
  const amountUSD =
    typeof item.amountUSD !== 'undefined' && Number(item.amountUSD) > 0
      ? formatUSD(Number(item.amountUSD)).replace(' USD', '')
      : null;

  return (
    <div className="flex items-center gap-3">
      <div className="relative h-6 w-10 shrink-0">
        <SafeImage
          alt={`${item.token.symbol} logo`}
          src={item.token.logoURI ?? undefined}
          width={24}
          height={24}
          className="absolute left-0 top-0 h-6 w-6 rounded-full"
          fallback={<div className="absolute left-0 top-0 h-6 w-6 rounded-full bg-white/20" />}
        />
        <LifiNetworkLogo chainId={item.chainId} />
      </div>
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
    <TransactionDetailsBox header={stepsCount > 1 ? 'Tokens' : 'Token'}>
      <div className="flex flex-col gap-3">
        {items.map((item) =>
          item.type === 'token' ? (
            <LifiTokenFlowRow item={item} key={item.id} />
          ) : (
            <LifiToolFlowRow item={item} key={item.id} />
          ),
        )}
      </div>
    </TransactionDetailsBox>
  );
}

export function LifiTransactionDetails({
  tx,
  embedMode,
  customAddressDetails,
}: {
  tx: LifiMergedTransaction;
  embedMode: boolean;
  customAddressDetails?: ReactNode;
}) {
  return (
    <div className={twMerge('grid gap-3', embedMode && 'min-[850px]:grid-cols-2')}>
      <TransactionDetailsBox>
        <div className="flex justify-between text-sm text-white">
          <span>{dayjs(tx.createdAt).format('MMMM D, YYYY')}</span>
          <span>{dayjs(tx.createdAt).format('h:mma')}</span>
        </div>
      </TransactionDetailsBox>

      <LifiTokenFlowDetailsBox tx={tx} />

      <TransactionDetailsBox header="Network">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <NetworkImage chainId={tx.sourceChainId} className="h-6 w-6" />
            <span className="text-base">{getNetworkName(tx.sourceChainId)}</span>
          </div>
          <ArrowRightIcon width={16} />
          <div className="flex items-center space-x-2">
            <NetworkImage chainId={tx.destinationChainId} className="h-6 w-6" />
            <span className="text-base">{getNetworkName(tx.destinationChainId)}</span>
          </div>
        </div>
      </TransactionDetailsBox>

      {customAddressDetails}

      <TransactionDetailsBox>
        <TransactionsTableDetailsSteps tx={tx} />
      </TransactionDetailsBox>
    </div>
  );
}
