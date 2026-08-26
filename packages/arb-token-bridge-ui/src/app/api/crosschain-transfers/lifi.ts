import {
  FeeCost,
  GasCost,
  LiFiStep,
  Route,
  RoutesRequest,
  createConfig,
  getRoutes,
} from '@lifi/sdk';
import { BigNumber, constants, utils } from 'ethers';
import { NextRequest, NextResponse } from 'next/server';

import { CommonAddress } from '@/bridge/util/CommonAddressUtils';

import { APE_TOKEN_LOGO, ETHER_TOKEN_LOGO } from '../../../constants';
import { ChainId } from '../../../types/ChainId';
import { addressesEqual } from '../../../util/AddressUtils';
import { getLifiRouteStepLabel, getLifiToolDetails } from '../../../util/LifiRouteUtils';
import { CrosschainTransfersRouteBase, QueryParams, RouteCost, Token } from './types';
import { isValidLifiTransfer } from './utils';

export const LIFI_INTEGRATOR_IDS = {
  NORMAL: '_arbitrum',
  EMBED: 'widget_prod',
} as const;

export enum Order {
  /**
   * This sorting option prioritises routes with the highest estimated return amount.
   * Users who value capital efficiency at the expense of speed and route complexity should choose the cheapest routes.
   */
  Cheapest = 'CHEAPEST',
  /**
   * This sorting option prioritizes routes with the shortest estimated execution time.
   * Users who value speed and want their transactions to be completed as quickly as possible should choose the fastest routes
   */
  Fastest = 'FASTEST',
}

export interface LifiCrosschainTransfersRoute extends CrosschainTransfersRouteBase {
  type: 'lifi';
  protocolData: {
    /** Full route used by LiFi SDK execution/resume. */
    route: Route;
  };
}

export type PreferredLifiRoutes =
  | []
  | [LifiCrosschainTransfersRoute]
  | [LifiCrosschainTransfersRoute, LifiCrosschainTransfersRoute];

function isUsdtToken(tokenAddress: string | undefined, chainId: number) {
  return (
    (addressesEqual(tokenAddress, CommonAddress.Ethereum.USDT) && chainId === ChainId.Ethereum) ||
    (addressesEqual(tokenAddress, CommonAddress.ArbitrumOne.USDT) &&
      chainId === ChainId.ArbitrumOne) ||
    (addressesEqual(tokenAddress, CommonAddress.ApeChain.USDT) && chainId === ChainId.ApeChain) ||
    (addressesEqual(tokenAddress, CommonAddress.Base.USDT) && chainId === ChainId.Base)
  );
}

function isApeToken(tokenAddress: string | undefined, chainId: number) {
  return (
    (addressesEqual(tokenAddress, constants.AddressZero) && chainId === ChainId.ApeChain) ||
    (addressesEqual(tokenAddress, CommonAddress.Ethereum.APE) && chainId === ChainId.Ethereum) ||
    (addressesEqual(tokenAddress, CommonAddress.ArbitrumOne.APE) &&
      chainId === ChainId.ArbitrumOne) ||
    (addressesEqual(tokenAddress, CommonAddress.Base.APE) && chainId === ChainId.Base) ||
    (addressesEqual(tokenAddress, CommonAddress.RobinhoodChain.APE) &&
      chainId === ChainId.RobinhoodChain)
  );
}

/** Override token metadata (symbol, name, ...) for special cases (e.g., USDT) */
function overrideTokenMetadata(token: Token, chainId: number): Token & { name?: string } {
  if (isUsdtToken(token.address, chainId)) {
    return {
      ...token,
      name: 'USDT',
      symbol: 'USDT',
    };
  }
  return token;
}

/**
 * Override token logos for special cases (e.g., ETH)
 * LiFi returns TrustWallet URLs, but we want to use local logos
 */
function overrideTokenLogo(token: Token, chainId: number): Token {
  if (addressesEqual(token.address, constants.AddressZero)) {
    if (chainId === ChainId.ApeChain) {
      return {
        ...token,
        logoURI: APE_TOKEN_LOGO,
      };
    }
    return {
      ...token,
      logoURI: ETHER_TOKEN_LOGO,
    };
  }

  if (isApeToken(token.address, chainId)) {
    return {
      ...token,
      logoURI: APE_TOKEN_LOGO,
    };
  }

  return token;
}

function applyOverrides(token: Token, chainId: number): Token {
  return overrideTokenLogo(overrideTokenMetadata(token, chainId), chainId);
}

function getRouteCosts(steps: LiFiStep[], kind: 'gas' | 'fee'): RouteCost[] {
  return steps.flatMap((step) => {
    const toolDetails = getLifiToolDetails(step.toolDetails);
    const costs: Array<{ cost: GasCost | FeeCost; estimate?: string }> =
      kind === 'gas'
        ? (step.estimate.gasCosts ?? []).map((cost) => ({ cost, estimate: cost.estimate }))
        : (step.estimate.feeCosts ?? []).filter((cost) => !cost.included).map((cost) => ({ cost }));

    return costs.map(
      ({ cost, estimate }, costIndex): RouteCost => ({
        amount: cost.amount,
        amountUSD: cost.amountUSD,
        token: applyOverrides(cost.token, cost.token.chainId),
        chainId: cost.token.chainId,
        estimate,
        details: {
          id: `${step.id}-${kind}-${costIndex}`,
          label: getLifiRouteStepLabel(step, kind),
          via: toolDetails.name,
          iconURI: toolDetails.logoURI,
        },
      }),
    );
  });
}

export function parseLifiRoute({
  route,
  fromAddress,
  toAddress,
  fromChainId,
  toChainId,
}: {
  route: Route;
  fromAddress?: string;
  toAddress?: string;
  fromChainId: string;
  toChainId: string;
}): LifiCrosschainTransfersRoute {
  const firstStep = route.steps[0];
  const lastStep = route.steps[route.steps.length - 1];
  if (!firstStep || !lastStep) {
    throw new Error('LiFi route is missing steps.');
  }
  return {
    type: 'lifi',
    durationMs: route.steps.reduce((durationMs, step) => {
      return durationMs + step.estimate.executionDuration * 1_000;
    }, 0),
    gas: getRouteCosts(route.steps, 'gas'),
    fee: getRouteCosts(route.steps, 'fee'),
    fromAmount: {
      /** Amount with all decimals (e.g. 100000000000000 for 0.0001 ETH) */
      amount: firstStep.action.fromAmount,
      amountUSD: firstStep.estimate.fromAmountUSD || '0',
      token: applyOverrides(firstStep.action.fromToken, firstStep.action.fromToken.chainId),
    },
    toAmount: {
      /** Amount with all decimals (e.g. 100000000000000 for 0.0001 ETH) */
      amount: lastStep.estimate.toAmount,
      amountUSD: lastStep.estimate.toAmountUSD || '0',
      token: applyOverrides(lastStep.action.toToken, lastStep.action.toToken.chainId),
    },
    fromAddress,
    toAddress,
    fromChainId: Number(fromChainId),
    toChainId: Number(toChainId),
    protocolData: {
      route,
    },
  };
}

function getPreferredRoutes(routes: LifiCrosschainTransfersRoute[]): PreferredLifiRoutes {
  const [firstRoute] = routes;
  if (!firstRoute) {
    return [];
  }

  const cheapestRoute =
    routes.find((route) => route.protocolData.route.tags?.includes(Order.Cheapest)) ??
    routes.reduce((cheapestRoute, route) => {
      if (BigNumber.from(route.toAmount.amount).gt(BigNumber.from(cheapestRoute.toAmount.amount))) {
        return route;
      }

      return cheapestRoute;
    }, firstRoute);
  const fastestRoute =
    routes.find((route) => route.protocolData.route.tags?.includes(Order.Fastest)) ??
    routes.reduce((fastestRoute, route) => {
      if (route.durationMs < fastestRoute.durationMs) {
        return route;
      }

      return fastestRoute;
    }, firstRoute);

  if (cheapestRoute.protocolData.route.id === fastestRoute.protocolData.route.id) {
    return [cheapestRoute];
  }

  return [cheapestRoute, fastestRoute];
}

type LifiCrossTransfersRoutesResponse =
  | {
      message: string;
      data: null;
    }
  | {
      data: PreferredLifiRoutes;
    };

export type LifiParams = QueryParams & {
  slippage?: string;
  denyBridges?: string[];
  denyExchanges?: string[];
};

function configureLifiSdk(integrator: string) {
  createConfig({
    integrator,
    apiKey: process.env.LIFI_KEY,
  });
}

function getIntegratorId(request: NextRequest): string {
  const referer = request.headers.get('referer');
  const isEmbedMode = referer && referer.includes('/bridge/embed');
  return isEmbedMode ? LIFI_INTEGRATOR_IDS.EMBED : LIFI_INTEGRATOR_IDS.NORMAL;
}

export async function getLifiRoutes(params: {
  fromChainId: number;
  toChainId: number;
  fromTokenAddress: string;
  toTokenAddress: string;
  fromAmount: string;
  fromAddress?: string;
  toAddress?: string;
  slippage?: number;
  integrator?: string;
}) {
  const { integrator = LIFI_INTEGRATOR_IDS.NORMAL } = params;

  configureLifiSdk(integrator);

  const options: RoutesRequest['options'] = {
    integrator,
    allowSwitchChain: false,
    allowDestinationCall: false,
  };

  if (params.slippage !== undefined) {
    options.slippage = params.slippage;
  }

  const { routes } = await getRoutes({
    fromAddress: params.fromAddress,
    fromChainId: params.fromChainId,
    toChainId: params.toChainId,
    fromTokenAddress: params.fromTokenAddress,
    toTokenAddress: params.toTokenAddress,
    fromAmount: params.fromAmount,
    toAddress: params.toAddress,
    options,
  });

  return routes;
}

export async function GET(
  request: NextRequest,
): Promise<NextResponse<LifiCrossTransfersRoutesResponse>> {
  const integratorId = getIntegratorId(request);

  configureLifiSdk(integratorId);

  const { searchParams } = new URL(request.url);
  const fromToken = searchParams.get('fromToken');
  const toToken = searchParams.get('toToken');
  const fromChainId = searchParams.get('fromChainId');
  const toChainId = searchParams.get('toChainId');
  const fromAmount = searchParams.get('fromAmount') || '0';
  const fromAddress = searchParams.get('fromAddress') || undefined;
  const toAddress = searchParams.get('toAddress') || undefined;
  const denyBridges = searchParams.getAll('denyBridges');
  const denyExchanges = searchParams.getAll('denyExchanges');
  const slippage = searchParams.get('slippage');

  try {
    // Validate parameters
    if (!fromToken || !utils.isAddress(fromToken)) {
      return NextResponse.json(
        { message: 'fromToken is not a valid address', data: null },
        { status: 400 },
      );
    }

    if (!toToken || !utils.isAddress(toToken)) {
      return NextResponse.json(
        { message: 'toToken is not a valid address', data: null },
        { status: 400 },
      );
    }

    if (!fromChainId) {
      return NextResponse.json({ message: 'fromChainId is required', data: null }, { status: 400 });
    }

    if (!toChainId) {
      return NextResponse.json({ message: 'toChainId is required', data: null }, { status: 400 });
    }

    if (
      !isValidLifiTransfer({
        fromToken,
        sourceChainId: Number(fromChainId),
        destinationChainId: Number(toChainId),
      })
    ) {
      return NextResponse.json(
        {
          message: `Sending fromToken (${fromToken}) from chain ${fromChainId} to chain ${toChainId} is not supported`,
          data: null,
        },
        { status: 400 },
      );
    }

    // Validate options
    const parsedSlippage = Number(slippage);
    if ((slippage && Number.isNaN(parsedSlippage)) || parsedSlippage <= 0 || parsedSlippage > 100) {
      return NextResponse.json(
        {
          message: `Slippage is invalid`,
          data: null,
        },
        { status: 400 },
      );
    }

    const parameters: RoutesRequest = {
      fromAddress,
      fromAmount,
      fromTokenAddress: fromToken,
      fromChainId: Number(fromChainId),
      toChainId: Number(toChainId),
      toTokenAddress: toToken,
      toAddress,
    };

    const options: RoutesRequest['options'] = {
      integrator: integratorId,
      allowSwitchChain: true,
      allowDestinationCall: true,
    };

    if (slippage) {
      options.slippage = parsedSlippage / 100;
    }

    options.bridges = {
      deny: denyBridges.concat(['arbitrum']),
    };

    if (denyExchanges.length > 0) {
      options.exchanges = {
        deny: denyExchanges,
      };
    }

    const { routes } = await getRoutes({ ...parameters, options });

    const parsedRoutes = routes.flatMap((route) => {
      try {
        return [
          parseLifiRoute({
            route,
            fromAddress,
            toAddress: toAddress || fromAddress,
            fromChainId,
            toChainId,
          }),
        ];
      } catch {
        return [];
      }
    });

    // LiFi identifies the cheapest and fastest routes. The same route can have both tags.
    return NextResponse.json(
      {
        data: getPreferredRoutes(parsedRoutes),
      },
      { status: 200 },
    );
  } catch (error: unknown) {
    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : 'Something went wrong',
        data: null,
      },
      { status: 500 },
    );
  }
}
