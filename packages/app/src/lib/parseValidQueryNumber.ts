/** Parses a query param as number; validates NaN, optional min/max/integer. When default is set, out-of-range is clamped; otherwise returns undefined. */
export function parseValidQueryNumber(
  value: string | null,
  opts: { default?: number; min?: number; max?: number; integer?: boolean },
): number | undefined {
  if (value === null) return opts.default;
  const parsed = Number(value);
  if (Number.isNaN(parsed)) return opts.default;
  if (opts.integer && !Number.isInteger(parsed)) return opts.default;
  let result = parsed;
  if (opts.min !== undefined && result < opts.min) {
    if (opts.default === undefined) return undefined;
    result = opts.min;
  }
  if (opts.max !== undefined && result > opts.max) {
    if (opts.default === undefined) return undefined;
    result = opts.max;
  }
  return result;
}
