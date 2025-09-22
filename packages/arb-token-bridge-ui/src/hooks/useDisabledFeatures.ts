import { useCallback } from 'react'
import { useArbQueryParams, DisabledFeatures } from './useArbQueryParams'
import { usePathname } from 'next/navigation'

export const useDisabledFeatures = () => {
  const [{ disabledFeatures }] = useArbQueryParams()
  const pathname = usePathname()

  const isFeatureDisabled = useCallback(
    (feature: DisabledFeatures) => {
      // disable withdrawals to non-arbitrum chains, and batch transfers in embed mode
      if (
        (feature === DisabledFeatures.TRANSFERS_TO_NON_ARBITRUM_CHAINS ||
          feature === DisabledFeatures.BATCH_TRANSFERS) &&
        pathname.includes('embed')
      ) {
        return true
      }

      return (disabledFeatures as readonly DisabledFeatures[]).includes(feature)
    },
    [disabledFeatures]
  )

  return { isFeatureDisabled }
}
