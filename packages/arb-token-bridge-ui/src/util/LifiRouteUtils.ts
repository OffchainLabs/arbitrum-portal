import type { Route, RouteExtended } from '@lifi/sdk';
import { constants, utils } from 'ethers';

import type { AmountWithToken, RouteTool } from '../app/api/crosschain-transfers/types';
import type { LifiRouteHistoryStep } from '../state/app/state';
import { addressesEqual } from './AddressUtils';
import { getNetworkName } from './networks';

type LifiRouteDisplayStep =
  | RouteExtended['steps'][number]
  | RouteExtended['steps'][number]['includedSteps'][number];

type LifiRouteSteps = Pick<Route, 'steps'> | Pick<RouteExtended, 'steps'>;

type LifiRouteSnapshot = {
  toolsDetails: [RouteTool, ...RouteTool[]];
  durationMs: number;
  fromAmount: AmountWithToken;
  toAmount: AmountWithToken;
};

type LifiTransactionSnapshotSource = Omit<Partial<LifiRouteSnapshot>, 'toolsDetails'> & {
  toolsDetails?: RouteTool[];
  toolDetails?: RouteTool;
  lifiRoute?: Route | RouteExtended;
  receivedAmount?: AmountWithToken;
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

export function getLifiRouteStepLabel(step: LifiRouteDisplayStep, kind: 'gas' | 'fee' = 'gas') {
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

  const tools = getLifiRouteDisplaySteps(route).reduce<RouteTool[]>((routeTools, step) => {
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

export function getLifiRouteDisplaySteps(
  route: LifiRouteSteps | undefined,
): LifiRouteDisplayStep[] {
  return (route?.steps ?? []).reduce<LifiRouteDisplayStep[]>((displaySteps, step) => {
    const includedSteps = step.includedSteps;
    displaySteps.push(...(includedSteps?.length ? includedSteps : [step]));
    return displaySteps;
  }, []);
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
      amount: lastStep.estimate.toAmount,
      amountUSD: lastStep.estimate.toAmountUSD || '0',
      token: lastStep.action.toToken,
      chainId: lastStep.action.toChainId,
    },
  };
}

function getLifiStepToAmount(step: LifiRouteDisplayStep): AmountWithToken {
  const execution = 'execution' in step ? step.execution : undefined;
  const completedExecution =
    execution?.status === 'DONE' && execution.toAmount !== undefined ? execution : undefined;
  const amount = completedExecution?.toAmount ?? step.estimate.toAmount;
  const token = completedExecution?.toToken ?? step.action.toToken;
  let amountUSD = step.estimate.toAmountUSD || '0';
  if (completedExecution?.toToken) {
    const receivedAmountUSD =
      Number(utils.formatUnits(amount, token.decimals)) * Number(token.priceUSD);
    amountUSD = Number.isFinite(receivedAmountUSD) ? String(receivedAmountUSD) : '0';
  }

  return {
    amount,
    amountUSD,
    token,
    chainId: completedExecution?.toToken?.chainId ?? step.action.toChainId,
  };
}

export function getLifiRouteHistorySteps(route: RouteExtended | undefined): LifiRouteHistoryStep[] {
  const snapshot = getLifiRouteSnapshot(route);
  if (!route || !snapshot) {
    return [];
  }

  const historySteps = route.steps.map((step) => {
    const includedSteps = getLifiRouteDisplaySteps({ steps: [step] });
    const displaySteps = includedSteps.map((displayStep, index) => {
      const fallbackToolDetails = getLifiToolDetails(displayStep.toolDetails);
      const toAmount = getLifiStepToAmount(index === includedSteps.length - 1 ? step : displayStep);

      return {
        toolDetails:
          snapshot.toolsDetails.find((tool) => tool.key === fallbackToolDetails.key) ??
          fallbackToolDetails,
        toAmount: {
          ...toAmount,
          token: {
            address: toAmount.token.address,
            decimals: toAmount.token.decimals,
            logoURI: toAmount.token.logoURI,
            symbol: toAmount.token.symbol,
          },
        },
      };
    });

    return {
      id: step.id,
      fromChainId: step.action.fromChainId,
      requiresApproval: !addressesEqual(step.action.fromToken.address, constants.AddressZero),
      displaySteps,
      execution: step.execution
        ? {
            status: step.execution.status,
            process: step.execution.process.map(({ type, status, txHash, txLink, txType }) => ({
              type,
              status,
              txHash,
              txLink,
              txType: typeof txType === 'string' ? txType : undefined,
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

  const { toolDetails, toolsDetails, durationMs, fromAmount } = transaction;
  const toAmount = transaction.toAmount ??
    transaction.receivedAmount ?? {
      amount: '0',
      amountUSD: '0',
      token: { address: constants.AddressZero, decimals: 0, logoURI: '', symbol: 'Unknown' },
    };
  const [primaryTool, ...otherTools] = toolsDetails ?? [];
  const normalizedToolsDetails: [RouteTool, ...RouteTool[]] | undefined = primaryTool
    ? [primaryTool, ...otherTools]
    : toolDetails
      ? [getLifiToolDetails(toolDetails)]
      : undefined;

  if (!normalizedToolsDetails || typeof durationMs !== 'number' || !fromAmount) {
    return undefined;
  }

  return {
    toolsDetails: normalizedToolsDetails,
    durationMs,
    fromAmount,
    toAmount,
  };
}
