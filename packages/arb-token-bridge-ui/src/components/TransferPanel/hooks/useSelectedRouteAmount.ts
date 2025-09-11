import { shallow } from 'zustand/shallow'
import { utils } from 'ethers'
import { useRouteStore, isLifiRoute } from './useRouteStore'
import { LifiCrosschainTransfersRoute } from '@/bridge/app/api/crosschain-transfers/lifi'
import { formatAmount } from '../../../util/NumberUtils'

export function useSelectedRouteAmount(): string | undefined {
  const { selectedRoute, routes } = useRouteStore(
    state => ({
      selectedRoute: state.selectedRoute,
      routes: state.routes
    }),
    shallow
  )

  if (!selectedRoute) {
    return undefined
  }

  const route = routes.find(r => r.type === selectedRoute)

  if (!route) {
    return undefined
  }

  if (isLifiRoute(route.type)) {
    const data = route.data as { route: LifiCrosschainTransfersRoute }
    return formatAmount(
      Number(
        utils.formatUnits(
          data.route.toAmount.amount,
          data.route.toAmount.token.decimals
        )
      )
    )
  }

  return (route.data as { amountReceived: string }).amountReceived
}
