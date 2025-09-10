import { shallow } from 'zustand/shallow'
import { utils } from 'ethers'
import { useRouteStore } from './useRouteStore'

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

  if (
    route.type !== 'lifi' &&
    route.type !== 'lifi-fastest' &&
    route.type !== 'lifi-cheapest'
  ) {
    return route.data.amountReceived
  }

  return utils.formatUnits(
    route.data.route.toAmount.amount,
    route.data.route.toAmount.token.decimals
  )
}
