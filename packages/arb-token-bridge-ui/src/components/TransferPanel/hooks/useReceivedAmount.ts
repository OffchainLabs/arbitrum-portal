import { utils } from 'ethers';
import { shallow } from 'zustand/shallow';

import { LifiCrosschainTransfersRoute } from '@/bridge/app/api/crosschain-transfers/lifi';

import { useArbQueryParams } from '../../../hooks/useArbQueryParams';
import { formatAmount } from '../../../util/NumberUtils';
import { useAmountBigNumber } from './useAmountBigNumber';
import { isLifiRoute, useRouteStore } from './useRouteStore';

export function useReceivedAmount() {
  const { selectedRoute, routes } = useRouteStore(
    (state) => ({
      selectedRoute: state.selectedRoute,
      routes: state.routes,
    }),
    shallow,
  );

  const [{ amount }] = useArbQueryParams();
  const amountBigNumber = useAmountBigNumber();

  if (!selectedRoute || amountBigNumber.lte(0)) {
    return amount || '0'; // amount can also be empty string, hence '0'
  }

  const route = routes.find((r) => r.type === selectedRoute);

  if (!route) {
    return amount;
  }

  if (isLifiRoute(route.type)) {
    const data = route.data as { route: LifiCrosschainTransfersRoute };
    return formatAmount(
      Number(utils.formatUnits(data.route.toAmount.amount, data.route.toAmount.token.decimals)),
    );
  }

  return (route.data as { amountReceived: string }).amountReceived || amount || '0';
}
