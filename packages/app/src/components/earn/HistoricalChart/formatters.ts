function getPriceMaximumFractionDigits(value: number): number {
  const abs = Math.abs(value);
  if (abs >= 1000) {
    return 2;
  }
  if (abs >= 1) {
    return 4;
  }
  return 6;
}

export function formatPriceUsd(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: getPriceMaximumFractionDigits(value),
  }).format(value);
}
