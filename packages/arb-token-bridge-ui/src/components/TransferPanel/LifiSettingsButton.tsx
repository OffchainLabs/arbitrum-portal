import { Cog8ToothIcon } from '@heroicons/react/24/outline'
import { DialogWrapper, useDialog2 } from '../common/Dialog2'
import { Button } from '../common/Button'
import { useAccountType } from '../../hooks/useAccountType'
import { isLifiRoute, RouteType, useRouteStore } from './hooks/useRouteStore'
import { useMemo } from 'react'

export function LifiSettingsButton() {
  const [dialogProps, openDialog] = useDialog2()
  const eligibleRouteTypes = useRouteStore(state => state.eligibleRouteTypes)

  const { accountType, isLoading: isLoadingAccountType } = useAccountType()
  const isSmartContractWallet = accountType === 'smart-contract-wallet'

  const isLifiEligible = useMemo(
    () => eligibleRouteTypes.some((route: RouteType) => isLifiRoute(route)),
    [eligibleRouteTypes]
  )

  /**
   * Show settings if we're displaying lifi routes
   * or if it's an EOA (to display custom destination address input)
   */
  const showSettingsButton =
    isLifiEligible && !isLoadingAccountType && !isSmartContractWallet

  if (!showSettingsButton) {
    return null
  }

  return (
    <>
      <DialogWrapper {...dialogProps} />
      <Button
        id="route-settings-button"
        variant="secondary"
        className="h-8 p-2 text-white"
        onClick={() => openDialog('settings')}
        aria-label="Open Settings"
      >
        <Cog8ToothIcon width={20} className="arb-hover text-white/80" />
      </Button>
    </>
  )
}
