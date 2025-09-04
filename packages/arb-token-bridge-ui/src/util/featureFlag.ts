export function isLifiEnabled() {
  return process.env.NEXT_PUBLIC_FEATURE_FLAG_LIFI === 'true'
}

export function isOnrampEnabled() {
  return process.env.NEXT_PUBLIC_FEATURE_FLAG_ONRAMP === 'true'
}

export const full_onramp_services_list = ['moonpay'] as const

export function onrampEnabledList() {
  return (
    process.env.NEXT_PUBLIC_FEATURE_FLAG_ONRAMP_SERVICES_ENABLED ?? 'moonpay'
  ).split(',') as (typeof full_onramp_services_list)[number][]
}

export function isOnrampServiceEnabled(
  service: (typeof full_onramp_services_list)[number]
) {
  return onrampEnabledList().includes(service)
}
