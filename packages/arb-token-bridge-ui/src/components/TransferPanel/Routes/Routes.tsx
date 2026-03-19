import { MinusCircleIcon, PlusCircleIcon } from '@heroicons/react/24/outline';
import { PropsWithChildren, useCallback, useEffect, useState } from 'react';
import React from 'react';
import { twMerge } from 'tailwind-merge';
import { shallow } from 'zustand/shallow';

import { LifiCrosschainTransfersRoute } from '../../../app/api/crosschain-transfers/lifi';
import { ERC20BridgeToken, TokenType } from '../../../hooks/arbTokenBridge.types';
import { useArbQueryParams } from '../../../hooks/useArbQueryParams';
import { useMode } from '../../../hooks/useMode';
import { useSelectedToken } from '../../../hooks/useSelectedToken';
import { LIFI_TRANSFER_LIST_ID } from '../../../util/TokenListUtils';
import { Button } from '../../common/Button';
import { DialogWrapper, useDialog2 } from '../../common/Dialog2';
import { useRouteStore } from '../hooks/useRouteStore';
import { useRoutesUpdater } from '../hooks/useRoutesUpdater';
import { ArbitrumCanonicalRoute } from './ArbitrumCanonicalRoute';
import { CctpRoute } from './CctpRoute';
import { LifiRoute } from './LifiRoute';
import { OftV2Route } from './OftV2Route';
import { BadgeType } from './Route';

function Wrapper({ children }: PropsWithChildren) {
  const { embedMode } = useMode();

  return (
    <div
      className={twMerge(
        'flex flex-col gap-2',
        embedMode && 'overflow-auto overflow-x-hidden rounded-md pb-2',
      )}
    >
      {children}
    </div>
  );
}

export const Routes = React.memo(() => {
  useRoutesUpdater();

  const [showHiddenRoutes, setShowHiddenRoutes] = useState(false);
  const [dialogProps, openDialog] = useDialog2();

  const [, setQueryParams] = useArbQueryParams();

  const { eligibleRouteTypes, routes, hasLowLiquidity, hasModifiedSettings, isLoading, hasError } =
    useRouteStore(
      (state) => ({
        isLoading: state.isLoading,
        eligibleRouteTypes: state.eligibleRouteTypes,
        routes: state.routes,
        hasLowLiquidity: state.hasLowLiquidity,
        hasModifiedSettings: state.hasModifiedSettings,
        hasError: state.error,
      }),
      shallow,
    );

  const { embedMode } = useMode();

  const MAX_ROUTES_VISIBLE = embedMode ? 2 : 3;

  const [selectedToken] = useSelectedToken();

  useEffect(() => {
    setShowHiddenRoutes(false);
  }, [selectedToken]);

  const getRouteTag = useCallback(
    (routeType: string): BadgeType | undefined => {
      switch (routeType) {
        case 'cctp':
          // Tag as "Best Deal" when shown with LiFi routes OR when shown with Canonical
          if (eligibleRouteTypes.includes('lifi') || eligibleRouteTypes.includes('arbitrum')) {
            return 'best-deal';
          }
          return undefined;

        case 'arbitrum':
          // Always show "Security guaranteed by Arbitrum" for security
          return 'security-guaranteed';

        case 'lifi-cheapest':
          if (eligibleRouteTypes.includes('cctp')) {
            // LiFi + CCTP: CCTP = "Best Deal", Cheapest LiFi = no tag
            return undefined;
          } else {
            // LiFi only: Show "best deal"
            // LiFi + Canonical: Cheapest LiFi = "Best Deal"
            return 'best-deal';
          }

        case 'lifi-fastest':
          // Fastest always gets "fastest" tag
          return 'fastest';

        case 'lifi':
          // Single LiFi route (when fastest and cheapest are the same)
          if (eligibleRouteTypes.includes('cctp')) {
            // LiFi + CCTP: CCTP = "Best Deal", LiFi = 'fastest'
            return 'fastest';
          } else {
            // LiFi only: Show "best deal"
            // LiFi + Canonical: LiFi = "Best Deal"
            return 'best-deal';
          }

        default:
          return undefined;
      }
    },
    [eligibleRouteTypes],
  );

  if (eligibleRouteTypes.length === 0) {
    return null;
  }

  const visibleRoutes = showHiddenRoutes ? routes : routes.slice(0, MAX_ROUTES_VISIBLE);
  const hasHiddenRoutes = routes.length > MAX_ROUTES_VISIBLE;

  const hasMoreRoutesOptions =
    !isLoading &&
    !hasError &&
    hasModifiedSettings &&
    routes.length > 0 &&
    routes.length < eligibleRouteTypes.length;

  return (
    <>
      <DialogWrapper {...dialogProps} />
      <Wrapper>
        {hasMoreRoutesOptions && (
          <Button
            variant="primary"
            className="flex-start w-full rounded bg-[#4970E920] p-3 text-sm"
            onClick={() => {
              openDialog('settings');
            }}
          >
            <div className="w-full whitespace-break-spaces text-left">
              Want more options? Consider updating your slippage in settings.
            </div>
          </Button>
        )}

        {visibleRoutes.map((route, index) => {
          const tag = getRouteTag(route.type);

          switch (route.type) {
            case 'oftV2':
              return <OftV2Route key={`oftV2-${index}`} />;
            case 'cctp':
              return <CctpRoute key={`cctp-${index}`} />;
            case 'lifi':
            case 'lifi-fastest':
            case 'lifi-cheapest':
              const token = (route.data.route as LifiCrosschainTransfersRoute).toAmount.token;
              const overrideToken = token
                ? ({
                    ...token,
                    type: TokenType.ERC20,
                    listIds: new Set<string>([LIFI_TRANSFER_LIST_ID]),
                  } as ERC20BridgeToken)
                : undefined;

              return (
                <LifiRoute
                  key={`lifi-${index}`}
                  type={route.type}
                  route={route.data.route}
                  tag={tag}
                  overrideToken={overrideToken}
                />
              );
            case 'arbitrum':
              return <ArbitrumCanonicalRoute key={`arbitrum-${index}`} />;
            default:
              return null;
          }
        })}

        {hasHiddenRoutes && (
          <div className="mt-1 flex justify-center text-xs text-white/80">
            <button
              className="arb-hover flex space-x-1"
              onClick={() => setShowHiddenRoutes(!showHiddenRoutes)}
            >
              <span>{showHiddenRoutes ? 'Show fewer routes' : 'Show more routes'}</span>
              {showHiddenRoutes ? <MinusCircleIcon width={16} /> : <PlusCircleIcon width={16} />}
            </button>
          </div>
        )}

        {hasLowLiquidity && (
          <div className="rounded border border-orange-dark bg-orange-dark/50 p-3 text-sm text-white">
            {hasModifiedSettings ? (
              <>
                Unable to find viable routes. Consider{' '}
                <button
                  onClick={() => setQueryParams({ settingsOpen: true })}
                  className="underline"
                >
                  updating your settings
                </button>{' '}
                or try a different amount.
              </>
            ) : (
              <>
                Low liquidity detected. Unable to find viable routes.
                <br />
                <br />
                You can try to:
                <ol className="mt-2 list-decimal pl-6">
                  <li>Check back soon: Liquidity conditions can improve.</li>
                  <li>Reduce your transaction amount.</li>
                  <li>Consider alternative assets or destinations.</li>
                </ol>
              </>
            )}
          </div>
        )}
      </Wrapper>
    </>
  );
});

Routes.displayName = 'Routes';
