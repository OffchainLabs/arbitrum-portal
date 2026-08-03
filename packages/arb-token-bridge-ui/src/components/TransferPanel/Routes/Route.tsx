import { ClockIcon, InformationCircleIcon, UserIcon } from '@heroicons/react/24/outline';
import dayjs from 'dayjs';
import { BigNumber, constants, utils } from 'ethers';
import React, { PropsWithChildren } from 'react';
import { twMerge } from 'tailwind-merge';

import { Tooltip } from '@/app/components/common/Tooltip';

import { RouteCost, Token } from '../../../app/api/crosschain-transfers/types';
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
  tag?: BadgeType | BadgeType[];
  selected: boolean;
  onSelectedRouteClick: SetRoute;
  isDisabled?: boolean;
};

export type RouteTool = {
  id: string;
  name: string;
  iconURI?: string;
};

export type RouteStep = {
  id: string;
  label: string;
  via: string;
  iconURI?: string;
  fromAmount: string | undefined;
  fromToken: Token;
  toAmount: string | undefined;
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

function getBadges(badgeTypes: BadgeType | BadgeType[]) {
  if (Array.isArray(badgeTypes)) {
    return badgeTypes.map(getBadgeFromBadgeType);
  }
  return getBadgeFromBadgeType(badgeTypes);
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
        const fromAmount = getFormattedRouteStepAmount({
          amount: item.fromAmount,
          token: item.fromToken,
        });
        const toAmount = getFormattedRouteStepAmount({
          amount: item.toAmount,
          token: item.toToken,
        });

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
      : [{ id: 'default-route-tool', name: bridge, iconURI: bridgeIconURI }];

  const content = (
    <div
      className="flex min-w-0 items-center gap-1 text-xs text-white"
      aria-label={`Route tools: ${tools.map((tool) => tool.name).join(', ')}`}
    >
      <span>via</span>
      {tools.map((tool, toolIndex) => (
        <React.Fragment key={tool.id}>
          {toolIndex > 0 && <span>+</span>}
          <SafeImage
            src={tool.iconURI}
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

function getFormattedRouteCost({ amount, token }: { amount: string | undefined; token: Token }) {
  if (!amount) {
    return '';
  }

  return formatAmount(BigNumber.from(amount), {
    decimals: token.decimals,
    symbol: token.symbol,
  });
}

function getFormattedRouteStepAmount({
  amount,
  token,
}: {
  amount: string | undefined;
  token: Token;
}) {
  if (!amount) {
    return '';
  }

  const formattedAmount = formatAmount(BigNumber.from(amount), {
    decimals: token.decimals,
  });

  return `${formattedAmount} ${token.symbol}`;
}

type DetailedCost = RouteCost & {
  details: {
    id: string;
    label: string;
    via: string;
    iconURI?: string;
  };
};

function hasCostDetails(cost: RouteCost): cost is DetailedCost {
  return (
    typeof cost.details?.id === 'string' &&
    typeof cost.details.label === 'string' &&
    typeof cost.details.via === 'string'
  );
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
  const amount = cost.amount;
  const token = cost.token;
  const amountUSD = cost.amountUSD;

  if (typeof amountUSD !== 'undefined') {
    return Number(amountUSD);
  }

  if (addressesEqual(token.address, constants.AddressZero) && amount) {
    return ethToUSD(Number(utils.formatEther(BigNumber.from(amount))));
  }

  const tokenPriceUSD = tokensFromLists?.[token.address.toLowerCase()]?.priceUSD;
  if (typeof tokenPriceUSD === 'number' && amount) {
    return Number(utils.formatUnits(BigNumber.from(amount), token.decimals)) * tokenPriceUSD;
  }

  return undefined;
}

function getRouteCostsTotalUSD(
  costs: RouteCost[] | undefined,
  ethToUSD: (eth: number) => number,
  tokensFromLists?: ContractStorage<ERC20BridgeToken>,
) {
  const costsWithAmount = costs?.filter((cost) => {
    return typeof cost.amount !== 'undefined' || typeof cost.amountUSD !== 'undefined';
  });

  if (!costsWithAmount || costsWithAmount.length === 0) {
    return undefined;
  }

  const costsUSD = costsWithAmount.map((cost) =>
    getRouteCostUSD({
      cost,
      ethToUSD,
      tokensFromLists,
    }),
  );

  if (costsUSD.some((costUSD) => typeof costUSD === 'undefined')) {
    return undefined;
  }

  return costsUSD
    .filter((costUSD): costUSD is number => typeof costUSD !== 'undefined')
    .reduce((total, costUSD) => total + costUSD, 0);
}

function getFormattedRouteCostSummary({
  costs,
  ethToUSD,
  showUSDValueForFees,
  tokensFromLists,
}: {
  costs: RouteCost[] | undefined;
  ethToUSD: (eth: number) => number;
  showUSDValueForFees: boolean;
  tokensFromLists: ContractStorage<ERC20BridgeToken>;
}) {
  const totalUSD = showUSDValueForFees
    ? getRouteCostsTotalUSD(costs, ethToUSD, tokensFromLists)
    : undefined;

  if (typeof totalUSD !== 'undefined') {
    return `~${formatUSD(totalUSD)}`;
  }

  return (
    costs
      ?.map((cost) =>
        getFormattedRouteCost({
          amount: cost.amount,
          token: cost.token,
        }),
      )
      .filter(Boolean)
      .join(' and ') || 'N/A'
  );
}

function FeeBreakdownTooltipContent({
  title,
  items,
  ethToUSD,
  tokensFromLists,
  showVia = true,
}: {
  title: string;
  items: DetailedCost[];
  ethToUSD: (eth: number) => number;
  tokensFromLists: ContractStorage<ERC20BridgeToken>;
  showVia?: boolean;
}) {
  const itemAmountsUSD = items.map((item) =>
    getRouteCostUSD({ cost: item, ethToUSD, tokensFromLists }),
  );

  const hasTotalAmountUSD = itemAmountsUSD.every((amountUSD) => typeof amountUSD !== 'undefined');

  const totalAmountUSD = hasTotalAmountUSD
    ? itemAmountsUSD.reduce((total, amountUSD) => total + Number(amountUSD), 0)
    : undefined;

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
      {items.map((item) => {
        const amount = getFormattedRouteCost({
          amount: item.amount,
          token: item.token,
        });
        const amountUSD = getRouteCostUSD({ cost: item, ethToUSD, tokensFromLists });
        const formattedAmountUSD =
          typeof amountUSD !== 'undefined' ? `~${formatUSD(amountUSD).replace(' USD', '')}` : null;

        return (
          <BreakdownTooltipItem
            key={item.details.id}
            iconURI={item.details.iconURI}
            label={item.details.label}
            via={item.details.via}
            showVia={showVia}
          >
            <div className="mt-0.5 text-[12px] leading-4 text-white/50">
              {amount}
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
};

const RouteFees = ({
  isLoadingGasEstimate,
  gasCost,
  bridgeFee,
  showUSDValueForFees,
}: RouteFeesProps) => {
  const { ethToUSD } = useETHPrice();
  const { data: tokensFromLists } = useTokensFromLists();
  const gasCostBreakdown = gasCost?.filter(hasCostDetails) ?? [];
  const bridgeCostBreakdown = bridgeFee?.filter(hasCostDetails) ?? [];
  const gasCostSummary = getFormattedRouteCostSummary({
    costs: gasCost,
    ethToUSD,
    showUSDValueForFees,
    tokensFromLists,
  });
  const bridgeFeeSummary = getFormattedRouteCostSummary({
    costs: bridgeFee,
    ethToUSD,
    showUSDValueForFees,
    tokensFromLists,
  });
  const hasBridgeFee = bridgeFee && bridgeFee.length > 0;

  return (
    <>
      <Tooltip
        content={
          gasCostBreakdown.length > 0 ? (
            <FeeBreakdownTooltipContent
              title="Gas fee breakdown"
              items={gasCostBreakdown}
              ethToUSD={ethToUSD}
              tokensFromLists={tokensFromLists}
            />
          ) : (
            'The gas fees paid to operate the network'
          )
        }
        wrapperClassName="inline-flex"
        contentProps={{
          className: gasCostBreakdown.length > 0 ? feeBreakdownTooltipClassName : undefined,
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
            ) : gasCost && gasCost.length > 0 ? (
              <div className="tabular-nums" aria-label="Route gas">
                {gasCostSummary}
              </div>
            ) : (
              <div aria-label="Route gas">{'N/A'}</div>
            )}
          </span>
        </div>
      </Tooltip>

      {hasBridgeFee && <DelimiterDot />}

      {hasBridgeFee && (
        <Tooltip
          content={
            bridgeCostBreakdown.length > 0 ? (
              <FeeBreakdownTooltipContent
                title="Bridge fee breakdown"
                items={bridgeCostBreakdown}
                ethToUSD={ethToUSD}
                tokensFromLists={tokensFromLists}
                showVia={false}
              />
            ) : (
              'The fee the bridge or DEX takes'
            )
          }
          wrapperClassName="inline-flex"
          contentProps={{
            className: bridgeCostBreakdown.length > 0 ? feeBreakdownTooltipClassName : undefined,
          }}
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
              {bridgeFeeSummary}
            </div>
          </div>
        </Tooltip>
      )}
    </>
  );
};

// Route Badge Component
type RouteBadgeProps = {
  tag?: BadgeType | BadgeType[];
};

const RouteBadge = ({ tag }: RouteBadgeProps) => {
  if (!tag) return null;

  return <div className="flex gap-1">{getBadges(tag)}</div>;
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
