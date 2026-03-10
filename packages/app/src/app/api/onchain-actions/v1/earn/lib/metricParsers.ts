export function parseOptionalNumber(rawValue: string | null | undefined): number | null {
  if (rawValue == null) {
    return null;
  }

  const parsed = Number(rawValue);
  return Number.isFinite(parsed) ? parsed : null;
}

export function parseOptionalPercentage(rawValue: number | null | undefined): number | null {
  if (typeof rawValue !== 'number' || !Number.isFinite(rawValue)) {
    return null;
  }

  return rawValue * 100;
}
