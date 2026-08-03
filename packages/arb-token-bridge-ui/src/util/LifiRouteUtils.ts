import type { Route, RouteExtended } from '@lifi/sdk';
import { BigNumber } from 'ethers';

import type { AmountWithToken } from '../state/app/state';
import { getNetworkName } from './networks';

type LifiToolDetails = {
  key: string;
  name: string;
  logoURI: string;
};

type LifiRouteSnapshot = {
  toolsDetails: LifiToolDetails[];
  durationMs: number;
  fromAmount: AmountWithToken;
  toAmount: AmountWithToken;
};

type LifiTransactionSnapshotSource = Partial<LifiRouteSnapshot> & {
  toolDetails?: LifiToolDetails;
  lifiRoute?: Route | RouteExtended;
};

const LIFI_FALLBACK_TOOL: LifiToolDetails = {
  key: 'lifi',
  name: 'LiFi',
  logoURI: '/icons/lifi.svg',
};

const LIFI_TOOL_DISPLAY_NAME_BY_KEY: Record<string, string> = {
  relay: 'Relay',
};

export function getLifiToolDetails(
  toolDetails: {
    key?: string;
    name?: string;
    logoURI?: string;
  } = {},
): LifiToolDetails {
  const key = toolDetails.key || toolDetails.name || LIFI_FALLBACK_TOOL.key;

  return {
    key,
    name: LIFI_TOOL_DISPLAY_NAME_BY_KEY[key.toLowerCase()] || toolDetails.name || key,
    logoURI: toolDetails.logoURI || LIFI_FALLBACK_TOOL.logoURI,
  };
}

export function getLifiRouteToolDetails(route: Route | RouteExtended | undefined) {
  return route?.steps[0]?.toolDetails
    ? getLifiToolDetails(route.steps[0].toolDetails)
    : LIFI_FALLBACK_TOOL;
}

function getLifiRouteChainName(chainId: number) {
  try {
    return getNetworkName(chainId);
  } catch {
    return `Chain ${chainId}`;
  }
}

export function getLifiRouteStepLabel(step: Route['steps'][number], kind: 'gas' | 'fee' = 'gas') {
  const fromChainName = getLifiRouteChainName(step.action.fromChainId);
  const toChainName = getLifiRouteChainName(step.action.toChainId);
  const fromTokenSymbol = step.action.fromToken.symbol;
  const toTokenSymbol = step.action.toToken.symbol;

  if (step.action.fromChainId === step.action.toChainId) {
    return kind === 'gas'
      ? `Swap ${fromChainName} (${fromTokenSymbol}) to ${toChainName} (${toTokenSymbol})`
      : `DEX on ${fromChainName} (${fromTokenSymbol} to ${toTokenSymbol})`;
  }

  return `Bridge from ${fromChainName} (${fromTokenSymbol}) to ${toChainName} (${toTokenSymbol})`;
}

export function getLifiRouteToolsDetails(route: Route | RouteExtended | undefined) {
  const seen = new Set<string>();

  return (route?.steps ?? []).reduce<LifiToolDetails[]>((tools, step, stepIndex) => {
    const toolDetails = getLifiToolDetails(step.toolDetails);
    const id = toolDetails.key || `${toolDetails.name}-${stepIndex}`;

    if (seen.has(id)) {
      return tools;
    }

    seen.add(id);
    tools.push(toolDetails);
    return tools;
  }, []);
}

function getLifiRouteDurationMs(route: Route | RouteExtended | undefined) {
  return (route?.steps ?? []).reduce((durationMs, step) => {
    return durationMs + step.estimate.executionDuration * 1_000;
  }, 0);
}

function getLifiRouteSnapshot(
  route: Route | RouteExtended | undefined,
): LifiRouteSnapshot | undefined {
  const firstStep = route?.steps[0];
  const lastStep = route?.steps[route.steps.length - 1];

  if (!firstStep?.action || !firstStep.estimate || !lastStep?.action || !lastStep.estimate) {
    return undefined;
  }

  const lastStepExecution = 'execution' in lastStep ? lastStep.execution : undefined;

  return {
    toolsDetails: getLifiRouteToolsDetails(route),
    durationMs: getLifiRouteDurationMs(route),
    fromAmount: {
      amount: BigNumber.from(firstStep.action.fromAmount),
      amountUSD: firstStep.estimate.fromAmountUSD || '0',
      token: firstStep.action.fromToken,
      chainId: firstStep.action.fromChainId,
    },
    toAmount: {
      amount: BigNumber.from(lastStepExecution?.toAmount ?? lastStep.estimate.toAmount),
      amountUSD: lastStep.estimate.toAmountUSD || '0',
      token: lastStepExecution?.toToken ?? lastStep.action.toToken,
      chainId: lastStep.action.toChainId,
    },
  };
}

export function getLifiTransactionSnapshot(
  transaction: LifiTransactionSnapshotSource,
): LifiRouteSnapshot | undefined {
  const routeSnapshot = getLifiRouteSnapshot(transaction.lifiRoute);
  if (routeSnapshot) {
    return routeSnapshot;
  }

  const { toolDetails, toolsDetails, durationMs, fromAmount, toAmount } = transaction;
  const normalizedToolsDetails = toolsDetails?.length
    ? toolsDetails
    : toolDetails
      ? [getLifiToolDetails(toolDetails)]
      : undefined;

  if (!normalizedToolsDetails || typeof durationMs !== 'number' || !fromAmount || !toAmount) {
    return undefined;
  }

  return {
    toolsDetails: normalizedToolsDetails,
    durationMs,
    fromAmount,
    toAmount,
  };
}
