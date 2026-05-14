export function parseOptionalNumber(rawValue: number | string | null | undefined): number | null {
  if (rawValue == null) {
    return null;
  }

  const parsed = Number(rawValue);
  return Number.isNaN(parsed) ? null : parsed;
}

export function parseOptionalPercentage(rawValue: number | null | undefined): number | null {
  if (typeof rawValue !== 'number' || Number.isNaN(rawValue)) {
    return null;
  }

  return rawValue * 100;
}
