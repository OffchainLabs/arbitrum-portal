import { ClockIcon, InformationCircleIcon, UserIcon } from '@heroicons/react/24/outline';
import dayjs from 'dayjs';
import { BigNumber, constants, utils } from 'ethers';
import React, { PropsWithChildren } from 'react';
import { twMerge } from 'tailwind-merge';

import { Tooltip } from '@/app/components/common/Tooltip';

import { RouteCost, RouteTool, Token } from '../../../app/api/crosschain-transfers/types';
import { useIsBatchTransferSupported } from '../../../hooks/TransferPanel/useIsBatchTransferSupported';
import { ContractStorage, ERC20BridgeToken } from '../../../hooks/arbTokenBridge.types';
import { useArbQueryParams } from '../../../hooks/useArbQueryParams';
import { useETHPrice } from '../../../hooks/useETHPrice';
import { useMode } from '../../../hooks/useMode';
import { NativeCurrency, useNativeCurrency } from '../../../hooks/useNativeCurrency';
import { useNetworks } from '../../../hooks/useNetworks';
import { useNetworksRelationship } from '../../../hooks/useNetworksRelationship';
import { useSelectedToken } from '../../../hooks/useSelectedToken';
import { addressesEqual } from '../../../util/AddressUtils';
import { shortenAddress } from '../../../util/CommonUtils';
import { formatAmount, formatUSD } from '../../../util/NumberUtils';
import { getUsdValueForAmount } from '../../../util/TokenPriceUtils';
import { getConfirmationTime } from '../../../util/WithdrawalUtils';
import { isNetwork } from '../../../util/networks';
import { getWagmiChain } from '../../../util/wagmi/getWagmiChain';
import { useAppContextState } from '../../App/AppContext';
import { SafeImage } from '../../common/SafeImage';
import { Loader } from '../../common/atoms/Loader';
import { TokenLogo } from '../TokenLogo';
import { useTokensFromLists } from '../TokenSearchUtils';
import { RouteType, SetRoute } from '../hooks/useRouteStore';

export type BadgeType = 'security-guaranteed' | 'best-deal' | 'fastest' | 'multi-step';
export type RouteProps = {
  type: RouteType;
  amountReceived: string;
  durationMs: number;
  isLoadingGasEstimate: boolean;
  overrideToken?: ERC20BridgeToken;
  gasCost: RouteCost[] | undefined;
  bridgeFee?: RouteCost[];
  bridge: string;
  bridgeIconURI: string;
  routeTools?: RouteTool[];
  routeSteps?: RouteStep[];
  tag?: BadgeType[];
  selected: boolean;
  onSelectedRouteClick: SetRoute;
  isDisabled?: boolean;
};

export type RouteStep = {
  id: string;
  label: string;
  via: string;
  iconURI?: string;
  fromAmount: string;
  fromToken: Token;
  toAmount: string;
  toToken: Token;
};

// Badge Components
function Tag({ children, className }: PropsWithChildren<{ className: string }>) {
  const { embedMode } = useMode();

  return (
    <div className="flex">
      <div
        className={twMerge(
          'flex h-fit items-center space-x-1 truncate rounded px-2 py-1 text-center text-xs',
          embedMode && 'min-[850px]:hidden',
          className,
        )}
      >
        <span>{children}</span>
      </div>
    </div>
  );
}

function getBadgeFromBadgeType(badgeType: BadgeType) {
  switch (badgeType) {
    case 'security-guaranteed': {
      return (
        <Tag className="hidden bg-claim text-black md:flex" key="security-guaranteed">
          Arbitrum Native
        </Tag>
      );
    }
    case 'best-deal': {
      return (
        <Tag className="bg-lavender text-black" key="best-deal">
          Cheapest Fast Bridge
        </Tag>
      );
    }
    case 'fastest': {
      return (
        <Tag className="bg-lavender text-black" key="fastest">
          Fastest
        </Tag>
      );
    }
    case 'multi-step': {
      return (
        <Tag className="bg-lavender text-black" key="multi-step">
          Multi-step
        </Tag>
      );
    }
  }
}

const DelimiterDot = () => <div className="h-1 w-1 rounded-full bg-white" />;

// Route Amount Component
type RouteAmountProps = {
  amountReceived: string;
  amountReceivedUsd: string | number | null;
  token: ERC20BridgeToken | NativeCurrency;
  showUsdValueForReceivedToken: boolean;
  isBatchTransferSupported: boolean;
  amount2?: string;
  amount2Usd: string | number | null;
  showUsdValueForAmount2: boolean;
  childNativeCurrency: ERC20BridgeToken | NativeCurrency;
};

const RouteAmount = ({
  amountReceived,
  amountReceivedUsd,
  token,
  showUsdValueForReceivedToken,
  isBatchTransferSupported,
  amount2,
  amount2Usd,
  showUsdValueForAmount2,
  childNativeCurrency,
}: RouteAmountProps) => {
  return (
    <div className="flex min-w-36 flex-col gap-1">
      <div className="flex flex-col gap-1 text-lg">
        <div className="flex flex-row items-center gap-3">
          <TokenLogo
            className="h-8 w-8 min-w-8"
            srcOverride={'type' in token ? (token.logoURI ?? '') : null}
            fallback={<div className="h-8 w-8 min-w-8 rounded-full bg-gray-dark/70" />}
          />
          <div className="flex flex-col">
            <div className="text-base">
              {formatAmount(Number(amountReceived))} {token.symbol}
            </div>

            {showUsdValueForReceivedToken && amountReceivedUsd !== null && (
              <div className="text-sm tabular-nums text-white/50">
                {formatUSD(Number(amountReceivedUsd))}
              </div>
            )}
          </div>
        </div>

        {isBatchTransferSupported && Number(amount2) > 0 && (
          <div className="flex flex-row items-center gap-3 text-base">
            <TokenLogo
              className="h-8 w-8 min-w-8"
              srcOverride={null}
              fallback={<div className="h-8 w-8 min-w-8 rounded-full bg-gray-dark/70" />}
            />
            <div className="flex flex-col">
              <div className="text-base">
                {formatAmount(Number(amount2), {
                  symbol: childNativeCurrency.symbol,
                })}
              </div>
              {showUsdValueForAmount2 && amount2Usd !== null && (
                <div className="text-sm tabular-nums text-white/50">
                  {formatUSD(Number(amount2Usd))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Route Duration Component
type RouteDurationProps = {
  durationMs: number;
  fastWithdrawalActive: boolean;
};

const RouteDuration = ({ durationMs, fastWithdrawalActive }: RouteDurationProps) => (
  <div className="flex items-center">
    <ClockIcon width={18} height={18} className="-ml-[1px]" />
    <span className="ml-1 whitespace-nowrap">
      {dayjs().add(durationMs, 'millisecond').fromNow(true)}
    </span>
    {fastWithdrawalActive && (
      <div className="flex items-center">
        <Tooltip
          content={
            'Fast Withdrawals relies on a committee of validators. In the event of a committee outage, your withdrawal falls back to the 7 day challenge period secured by Arbitrum Fraud Proofs.'
          }
        >
          <InformationCircleIcon className="ml-1 h-3 w-3" />
        </Tooltip>
      </div>
    )}
  </div>
);

// Route Bridge Component
type RouteBridgeProps = {
  bridge: string;
  bridgeIconURI: string;
  routeTools?: RouteTool[];
  routeSteps?: RouteStep[];
};

const feeBreakdownTooltipClassName =
  'max-w-none rounded-lg border border-white/10 px-4 py-3 text-white shadow-[0_0_40px_rgba(0,0,0,0.75)]';

function BreakdownTooltipContent({
  title,
  children,
  footer,
}: PropsWithChildren<{
  title: string;
  footer?: React.ReactNode;
}>) {
  return (
    <div className="w-[310px] max-w-[calc(100vw_-_48px)] text-left">
      <div className="text-[11px] uppercase leading-4 text-white/50">{title}</div>
      <div className="mt-2 border-t border-white/10 pt-2">
        <div className="space-y-3">{children}</div>
        {footer}
      </div>
    </div>
  );
}

function BreakdownTooltipItem({
  iconURI,
  label,
  via,
  showVia = true,
  children,
}: PropsWithChildren<{
  iconURI?: string;
  label: string;
  via: string;
  showVia?: boolean;
}>) {
  return (
    <div className="flex gap-2">
      <SafeImage
        src={iconURI}
        width={16}
        height={16}
        alt=""
        className="mt-[2px] h-4 w-4 min-w-4 rounded-full"
        fallback={<div className="mt-[2px] h-4 w-4 min-w-4 rounded-full bg-lavender" />}
      />
      <div className="min-w-0 flex-1">
        <div className="text-[13px] leading-4 text-white">{label}</div>
        {showVia && <div className="text-[13px] leading-4 text-white">via {via}</div>}
        {children}
      </div>
    </div>
  );
}

function RouteDetailsTooltipContent({ items }: { items: RouteStep[] }) {
  return (
    <BreakdownTooltipContent title="ROUTE">
      {items.map((item) => {
        const fromAmount = formatRouteStepAmount(item.fromAmount, item.fromToken);
        const toAmount = formatRouteStepAmount(item.toAmount, item.toToken);

        return (
          <BreakdownTooltipItem
            key={item.id}
            iconURI={item.iconURI}
            label={item.label}
            via={item.via}
          >
            {fromAmount && toAmount && (
              <div className="mt-0.5 text-[12px] leading-4 text-white/50">
                {fromAmount} → {toAmount}
              </div>
            )}
          </BreakdownTooltipItem>
        );
      })}
    </BreakdownTooltipContent>
  );
}

const RouteBridge = ({ bridge, bridgeIconURI, routeTools, routeSteps }: RouteBridgeProps) => {
  const tools =
    routeTools && routeTools.length > 0
      ? routeTools
      : [{ key: 'default-route-tool', name: bridge, logoURI: bridgeIconURI }];

  const content = (
    <div
      className="flex min-w-0 items-center gap-1 text-xs text-white"
      aria-label={`Route tools: ${tools.map((tool) => tool.name).join(', ')}`}
    >
      <span>via</span>
      {tools.map((tool, toolIndex) => (
        <React.Fragment key={tool.key}>
          {toolIndex > 0 && <span>+</span>}
          <SafeImage
            src={tool.logoURI}
            width={15}
            height={15}
            alt=""
            className="h-[15px] max-h-[15px] w-[15px] min-w-[15px] max-w-[15px] rounded-full"
            fallback={
              <div className="h-[15px] w-[15px] min-w-[15px] rounded-full bg-gray-dark/70" />
            }
          />
        </React.Fragment>
      ))}
    </div>
  );

  if (!routeSteps || routeSteps.length === 0) {
    return content;
  }

  return (
    <Tooltip
      as="div"
      content={<RouteDetailsTooltipContent items={routeSteps} />}
      wrapperClassName="inline-flex min-w-0"
      contentProps={{ className: feeBreakdownTooltipClassName }}
    >
      {content}
    </Tooltip>
  );
};

function formatRouteStepAmount(amount: string, token: Token) {
  const formattedAmount = formatAmount(BigNumber.from(amount), {
    decimals: token.decimals,
  });

  return `${formattedAmount} ${token.symbol}`;
}

function getRouteCostUSD({
  cost,
  ethToUSD,
  tokensFromLists,
}: {
  cost: RouteCost;
  ethToUSD: (eth: number) => number;
  tokensFromLists?: ContractStorage<ERC20BridgeToken>;
}) {
  if (typeof cost.amountUSD !== 'undefined') {
    return Number(cost.amountUSD);
  }

  const isEthNativeCost = getWagmiChain(cost.chainId).nativeCurrency.symbol === 'ETH';
  if (addressesEqual(cost.token.address, constants.AddressZero) && isEthNativeCost) {
    return ethToUSD(Number(utils.formatEther(BigNumber.from(cost.amount))));
  }

  const tokenPriceUSD = tokensFromLists?.[cost.token.address.toLowerCase()]?.priceUSD;
  if (typeof tokenPriceUSD === 'number') {
    return (
      Number(utils.formatUnits(BigNumber.from(cost.amount), cost.token.decimals)) * tokenPriceUSD
    );
  }

  return undefined;
}

type RouteCostDisplay = {
  cost: RouteCost;
  amountUSD: number | undefined;
  formattedAmount: string;
};

function getRouteCostsDisplay({
  costs,
  ethToUSD,
  showUSDValueForFees,
  tokensFromLists,
}: {
  costs: RouteCost[];
  ethToUSD: (eth: number) => number;
  showUSDValueForFees: boolean;
  tokensFromLists: ContractStorage<ERC20BridgeToken>;
}) {
  const items: RouteCostDisplay[] = costs.map((cost) => ({
    cost,
    amountUSD: showUSDValueForFees
      ? getRouteCostUSD({ cost, ethToUSD, tokensFromLists })
      : undefined,
    formattedAmount: formatAmount(BigNumber.from(cost.amount), {
      decimals: cost.token.decimals,
      symbol: cost.token.symbol,
    }),
  }));
  const hasTotalUSD =
    items.length > 0 && items.every((item) => typeof item.amountUSD !== 'undefined');
  const totalUSD = hasTotalUSD
    ? items.reduce((total, item) => total + Number(item.amountUSD), 0)
    : undefined;
  const summary =
    showUSDValueForFees && typeof totalUSD !== 'undefined'
      ? `~${formatUSD(totalUSD)}`
      : items.map((item) => item.formattedAmount).join(' and ') || 'N/A';

  return { items, summary, totalUSD };
}

function FeeBreakdownTooltipContent({
  title,
  items,
  totalAmountUSD,
  showVia = true,
}: {
  title: string;
  items: RouteCostDisplay[];
  totalAmountUSD: number | undefined;
  showVia?: boolean;
}) {
  return (
    <BreakdownTooltipContent
      title={title}
      footer={
        typeof totalAmountUSD !== 'undefined' ? (
          <div className="mt-3 flex items-center justify-between gap-4 text-[13px] leading-4">
            <span className="text-white/90">Total cost</span>
            <span className="font-semibold text-white">~{formatUSD(totalAmountUSD)}</span>
          </div>
        ) : undefined
      }
    >
      {items.map(({ cost, amountUSD, formattedAmount }) => {
        const formattedAmountUSD =
          typeof amountUSD !== 'undefined' ? `~${formatUSD(amountUSD).replace(' USD', '')}` : null;

        return (
          <BreakdownTooltipItem
            key={cost.details.id}
            iconURI={cost.details.iconURI}
            label={cost.details.label}
            via={cost.details.via}
            showVia={showVia}
          >
            <div className="mt-0.5 text-[12px] leading-4 text-white/50">
              {formattedAmount}
              {formattedAmountUSD && ` (${formattedAmountUSD})`}
            </div>
          </BreakdownTooltipItem>
        );
      })}
    </BreakdownTooltipContent>
  );
}

// Route Fees Component
type RouteFeesProps = {
  isLoadingGasEstimate: boolean;
  gasCost: RouteCost[] | undefined;
  bridgeFee?: RouteCost[];
  showUSDValueForFees: boolean;
  tokensFromLists: ContractStorage<ERC20BridgeToken>;
};

const RouteFees = ({
  isLoadingGasEstimate,
  gasCost,
  bridgeFee,
  showUSDValueForFees,
  tokensFromLists,
}: RouteFeesProps) => {
  const { ethToUSD } = useETHPrice();
  const gasCosts = gasCost ?? [];
  const bridgeFees = bridgeFee ?? [];
  const gasCostDisplay = getRouteCostsDisplay({
    costs: gasCosts,
    ethToUSD,
    showUSDValueForFees,
    tokensFromLists,
  });
  const bridgeFeeDisplay = bridgeFees.length
    ? getRouteCostsDisplay({
        costs: bridgeFees,
        ethToUSD,
        showUSDValueForFees,
        tokensFromLists,
      })
    : undefined;

  return (
    <>
      <Tooltip
        content={
          gasCosts.length > 0 ? (
            <FeeBreakdownTooltipContent
              title="Gas fee breakdown"
              items={gasCostDisplay.items}
              totalAmountUSD={gasCostDisplay.totalUSD}
            />
          ) : (
            'The gas fees paid to operate the network'
          )
        }
        wrapperClassName="inline-flex"
        contentProps={{
          className: gasCosts.length > 0 ? feeBreakdownTooltipClassName : undefined,
        }}
      >
        <div className="flex items-center">
          <SafeImage
            src="/icons/gas.svg"
            width={14}
            height={14}
            alt="gas"
            fallback={<div className="h-4 w-4 min-w-4 rounded-full bg-gray-dark/70" />}
          />
          <span className="ml-1">
            {isLoadingGasEstimate ? (
              <Loader size="small" color="white" />
            ) : gasCosts.length > 0 ? (
              <div className="tabular-nums" aria-label="Route gas">
                {gasCostDisplay.summary}
              </div>
            ) : (
              <div aria-label="Route gas">{'N/A'}</div>
            )}
          </span>
        </div>
      </Tooltip>

      {bridgeFeeDisplay && (
        <>
          <DelimiterDot />
          <Tooltip
            content={
              <FeeBreakdownTooltipContent
                title="Bridge fee breakdown"
                items={bridgeFeeDisplay.items}
                totalAmountUSD={bridgeFeeDisplay.totalUSD}
                showVia={false}
              />
            }
            wrapperClassName="inline-flex"
            contentProps={{ className: feeBreakdownTooltipClassName }}
          >
            <div className="flex items-center gap-1">
              <SafeImage
                src="/icons/bridge.svg"
                width={18}
                height={18}
                alt="bridge fee"
                fallback={<div className="h-4 w-4 min-w-4 rounded-full bg-gray-dark/70" />}
              />
              <div className="tabular-nums" aria-label="Route bridge fee">
                {bridgeFeeDisplay.summary}
              </div>
            </div>
          </Tooltip>
        </>
      )}
    </>
  );
};

// Route Badge Component
type RouteBadgeProps = {
  tag?: BadgeType[];
};

const RouteBadge = ({ tag }: RouteBadgeProps) => {
  if (!tag) return null;

  return <div className="flex gap-1">{tag.map(getBadgeFromBadgeType)}</div>;
};

// Main Route Component
export const Route = React.memo(
  ({
    type,
    bridge,
    bridgeIconURI,
    durationMs,
    amountReceived,
    isLoadingGasEstimate,
    overrideToken,
    gasCost,
    selected,
    bridgeFee,
    routeTools,
    routeSteps,
    tag,
    onSelectedRouteClick,
    isDisabled: isDisabledOverride = false,
  }: RouteProps) => {
    const {
      layout: { isTransferring },
    } = useAppContextState();
    const isDisabled = isDisabledOverride || isTransferring;
    const [networks] = useNetworks();
    const { childChainProvider, isDepositMode } = useNetworksRelationship(networks);
    const childNativeCurrency = useNativeCurrency({
      provider: childChainProvider,
    });
    const [_token] = useSelectedToken();
    const [{ amount2, destinationAddress }] = useArbQueryParams();
    const isBatchTransferSupported = useIsBatchTransferSupported();
    const [{ theme }] = useArbQueryParams();
    const { ethPrice } = useETHPrice();
    const { data: tokensFromLists } = useTokensFromLists();

    const token = overrideToken || _token || childNativeCurrency;

    const { isTestnet } = isNetwork(networks.sourceChain.id);
    const nativeCurrencyPrice = childNativeCurrency.isCustom
      ? tokensFromLists[childNativeCurrency.address.toLowerCase()]?.priceUSD
      : ethPrice;
    const selectedTokenForPrice = 'listIds' in token ? token : null;
    const tokenUsdValue = getUsdValueForAmount({
      amount: amountReceived,
      selectedToken: selectedTokenForPrice,
      nativeCurrency: childNativeCurrency,
      nativeCurrencyPrice,
      tokensFromLists,
    });
    const amountReceivedUsd = isTestnet ? null : tokenUsdValue;
    const showUsdValueForReceivedToken = !isTestnet && amountReceivedUsd !== null;
    const amount2Usd =
      !isTestnet && Number(amount2) > 0
        ? getUsdValueForAmount({
            amount: amount2,
            selectedToken: null,
            nativeCurrency: childNativeCurrency,
            nativeCurrencyPrice,
            tokensFromLists,
          })
        : null;
    const showUsdValueForAmount2 = !isTestnet && amount2Usd !== null;

    const { fastWithdrawalActive } = !isDepositMode
      ? getConfirmationTime(networks.sourceChain.id)
      : { fastWithdrawalActive: false };

    return (
      <button
        className={twMerge(
          'relative flex max-w-[calc(100vw_-_40px)] flex-col gap-3 rounded border border-[#ffffff33] bg-[#ffffff1a] p-3 text-left text-sm text-white transition-colors',
          'focus-visible:!outline-none',
          'focus-within:bg-[#ffffff36] hover:bg-[#ffffff36]',
          isDisabled ? 'opacity-50' : 'opacity-100',
          !isDisabled && selected && 'border-primary-cta',
        )}
        style={
          !isDisabled && selected
            ? {
                borderColor: theme.primaryCtaColor ?? '#325EE6',
                backgroundColor: theme.primaryCtaColor ? `${theme.primaryCtaColor}60` : '#325EE660',
              }
            : {}
        }
        onClick={() => onSelectedRouteClick(type)}
        disabled={isDisabled}
        aria-label={`Route ${type}`}
      >
        <div
          className={twMerge(
            'flex flex-row flex-wrap items-center justify-between gap-2',
            isBatchTransferSupported && Number(amount2) > 0 && 'items-start',
          )}
        >
          <RouteAmount
            amountReceived={amountReceived}
            amountReceivedUsd={amountReceivedUsd}
            token={token}
            showUsdValueForReceivedToken={showUsdValueForReceivedToken}
            isBatchTransferSupported={isBatchTransferSupported}
            amount2={amount2}
            amount2Usd={amount2Usd}
            showUsdValueForAmount2={showUsdValueForAmount2}
            childNativeCurrency={childNativeCurrency}
          />

          <div className="flex flex-wrap gap-3 overflow-hidden">
            <div className="flex flex-nowrap items-center">
              <RouteBridge
                bridge={bridge}
                bridgeIconURI={bridgeIconURI}
                routeTools={routeTools}
                routeSteps={routeSteps}
              />
            </div>
            <RouteBadge tag={tag} />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs opacity-70">
          <RouteDuration durationMs={durationMs} fastWithdrawalActive={fastWithdrawalActive} />

          <DelimiterDot />

          <RouteFees
            isLoadingGasEstimate={isLoadingGasEstimate}
            gasCost={gasCost}
            bridgeFee={bridgeFee}
            showUSDValueForFees={!isTestnet}
            tokensFromLists={tokensFromLists}
          />

          {/* if custom destination address is the receiver, explicitly show it */}
          {destinationAddress && (
            <>
              <DelimiterDot />
              <Tooltip
                content={`${destinationAddress} will be the recipient of the funds. Be sure you mean to send it here.`}
              >
                <div className="flex items-center gap-1 rounded bg-orange-dark px-1 py-0.5 text-xs">
                  <UserIcon className="h-3 w-3" />
                  {shortenAddress(destinationAddress)} will receive
                </div>
              </Tooltip>
            </>
          )}
        </div>
      </button>
    );
  },
);

Route.displayName = 'Route';
