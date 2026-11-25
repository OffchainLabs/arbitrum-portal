export function isLifiEnabled() {
  return process.env.NEXT_PUBLIC_FEATURE_FLAG_LIFI === 'true';
}

export function isCctpEnabled() {
  return process.env.NEXT_PUBLIC_FEATURE_FLAG_CCTP === 'true';
}

export function isEarnEnabled() {
  return process.env.NEXT_PUBLIC_FEATURE_FLAG_EARN === 'true';
}

export function isOnrampEnabled() {
  return process.env.NEXT_PUBLIC_FEATURE_FLAG_ONRAMP === 'true';
}
