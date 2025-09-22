import { useCallback } from 'react'
import { useArbQueryParams, DisabledFeatures } from './useArbQueryParams'

export const useDisabledFeatures = () => {
  const [{ disabledFeatures, mode }] = useArbQueryParams()

  const isFeatureDisabled = useCallback(
    (feature: DisabledFeatures) => {
      // disable withdrawals to non-arbitrum chains, and batch transfers in embed mode
      if (
        (feature === DisabledFeatures.TRANSFERS_TO_NON_ARBITRUM_CHAINS ||
          feature === DisabledFeatures.BATCH_TRANSFERS) &&
        typeof mode !== 'undefined'
      ) {
        return true
      }

      return (disabledFeatures as readonly DisabledFeatures[]).includes(feature)
    },
    [disabledFeatures]
  )

  return { isFeatureDisabled }
}
