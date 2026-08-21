import type { Route, RouteExtended } from '@lifi/sdk';

import type { AmountWithToken, RouteTool } from '../app/api/crosschain-transfers/types';
import type { LifiRouteHistoryStep } from '../state/app/state';
import { getNetworkName } from './networks';

type LifiRouteSnapshot = {
  toolsDetails: RouteTool[];
  durationMs: number;
  fromAmount: AmountWithToken;
  toAmount: AmountWithToken;
};

type LifiTransactionSnapshotSource = Partial<LifiRouteSnapshot> & {
  toolDetails?: RouteTool;
  lifiRoute?: Route | RouteExtended;
};

const LIFI_FALLBACK_TOOL: RouteTool = {
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
): RouteTool {
  const key = toolDetails.key || toolDetails.name || LIFI_FALLBACK_TOOL.key;

  return {
    key,
    name: LIFI_TOOL_DISPLAY_NAME_BY_KEY[key.toLowerCase()] || toolDetails.name || key,
    logoURI: toolDetails.logoURI || LIFI_FALLBACK_TOOL.logoURI,
  };
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

export function getLifiRouteToolsDetails(
  route: Route | RouteExtended | undefined,
): [RouteTool, ...RouteTool[]] {
  const seen = new Set<string>();

  const tools = (route?.steps ?? []).reduce<RouteTool[]>((routeTools, step) => {
    const toolDetails = getLifiToolDetails(step.toolDetails);

    if (seen.has(toolDetails.key)) {
      return routeTools;
    }

    seen.add(toolDetails.key);
    routeTools.push(toolDetails);
    return routeTools;
  }, []);

  const [primaryTool, ...otherTools] = tools;
  return primaryTool ? [primaryTool, ...otherTools] : [LIFI_FALLBACK_TOOL];
}

function getLifiRouteSnapshot(
  route: Route | RouteExtended | undefined,
): LifiRouteSnapshot | undefined {
  const steps = route?.steps;
  const firstStep = steps?.[0];
  const lastStep = steps?.[steps.length - 1];

  if (!firstStep?.action || !firstStep.estimate || !lastStep?.action || !lastStep.estimate) {
    return undefined;
  }

  const lastStepExecution = 'execution' in lastStep ? lastStep.execution : undefined;

  return {
    toolsDetails: getLifiRouteToolsDetails(route),
    durationMs: (route?.steps ?? []).reduce(
      (durationMs, step) => durationMs + step.estimate.executionDuration * 1_000,
      0,
    ),
    fromAmount: {
      amount: firstStep.action.fromAmount,
      amountUSD: firstStep.estimate.fromAmountUSD || '0',
      token: firstStep.action.fromToken,
      chainId: firstStep.action.fromChainId,
    },
    toAmount: {
      amount: lastStepExecution?.toAmount ?? lastStep.estimate.toAmount,
      amountUSD: lastStep.estimate.toAmountUSD || '0',
      token: lastStepExecution?.toToken ?? lastStep.action.toToken,
      chainId: lastStep.action.toChainId,
    },
  };
}

export function getLifiRouteHistorySteps(route: RouteExtended | undefined): LifiRouteHistoryStep[] {
  const snapshot = getLifiRouteSnapshot(route);
  if (!route || !snapshot) {
    return [];
  }

  const historySteps = route.steps.map((step) => {
    const fallbackToolDetails = getLifiToolDetails(step.toolDetails);

    return {
      id: step.id,
      fromChainId: step.action.fromChainId,
      display: {
        toolDetails:
          snapshot.toolsDetails.find((tool) => tool.key === fallbackToolDetails.key) ??
          fallbackToolDetails,
        toAmount: {
          amount: step.execution?.toAmount ?? step.estimate.toAmount,
          amountUSD: step.estimate.toAmountUSD ?? '0',
          chainId: step.action.toChainId,
          token: {
            address: (step.execution?.toToken ?? step.action.toToken).address,
            decimals: (step.execution?.toToken ?? step.action.toToken).decimals,
            logoURI: (step.execution?.toToken ?? step.action.toToken).logoURI,
            symbol: (step.execution?.toToken ?? step.action.toToken).symbol,
          },
        },
      },
      execution: step.execution
        ? {
            status: step.execution.status,
            process: step.execution.process.map(({ type, status, txHash, txLink }) => ({
              type,
              status,
              txHash,
              txLink,
            })),
          }
        : undefined,
    };
  });

  return historySteps;
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
