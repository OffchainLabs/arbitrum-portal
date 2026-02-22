import { BigNumber, utils } from 'ethers';

export function formatUSD(value: number) {
  if (value === 0) {
    return `$0.00 USD`;
  }

  if (value > 0 && value < 0.01) {
    return `< $0.01 USD`;
  }

  const formattedValue = value.toLocaleString(undefined, {
    minimumFractionDigits: Number.isInteger(value) ? undefined : 2,
    maximumFractionDigits: 2,
  });

  return `$${formattedValue} USD`;
}

export function formatCompactUsd(value: number): string {
  return (
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value) + ' USD'
  );
}

const formatCompact = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  maximumFractionDigits: 1,
});

export function formatCompactNumber(n: number): string {
  return formatCompact.format(n);
}

export function formatPercentage(value: number): string {
  if (value < 0.01) return `${value.toFixed(4)}%`;
  if (value < 1) return `${value.toFixed(3)}%`;
  return `${value.toFixed(2)}%`;
}

export enum MaximumFractionDigits {
  None = 0,
  Short = 1,
  Compact = 3,
  Standard = 4,
  Long = 5,
}

/**
 * Parse number according to english formatting.
 *
 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat
 *
 * Should not be used directly, use formatAmount instead
 */
const formatNumber = (
  number: number,
  options: {
    maximumFractionDigits: MaximumFractionDigits;
    notation: 'standard' | 'compact';
  },
): string => Intl.NumberFormat('en', options).format(number);

// Format amount according to a specific set of rules to limit space used
export const formatAmount = <T extends number | BigNumber | undefined>(
  balance: T,
  options: {
    decimals?: number;
    symbol?: string;
  } = {},
): string => {
  const { decimals, symbol } = options;

  if (typeof balance === 'undefined') {
    return '';
  }

  const value: number = BigNumber.isBigNumber(balance)
    ? parseFloat(utils.formatUnits(balance, decimals))
    : balance;
  const suffix = symbol ? ` ${symbol}` : '';

  if (value === 0) {
    return `0${suffix}`;
  }

  const isShortSymbol = options.symbol ? options.symbol.length < 5 : true;

  // Small number, show 4 or 5 decimals based on token name length
  if (value < 1) {
    const maximumFractionDigits = isShortSymbol
      ? MaximumFractionDigits.Long
      : MaximumFractionDigits.Standard;
    const minDisplayValue = Math.pow(10, -maximumFractionDigits);
    if (value < minDisplayValue) {
      return `< 0.${'0'.repeat(maximumFractionDigits - 1)}1${suffix}`;
    }

    return (
      formatNumber(value, {
        maximumFractionDigits: isShortSymbol
          ? MaximumFractionDigits.Long
          : MaximumFractionDigits.Standard,
        notation: 'compact',
      }) + suffix
    );
  }

  // Long token name, display shortened form with only 1 decimal
  if (!isShortSymbol) {
    return (
      formatNumber(value, {
        maximumFractionDigits: MaximumFractionDigits.Short,
        notation: 'compact',
      }) + suffix
    );
  }

  // Show compact number (1.234T, 1.234M)
  if (value >= 1_000_000) {
    return (
      formatNumber(value, {
        maximumFractionDigits: MaximumFractionDigits.Compact,
        notation: 'compact',
      }) + suffix
    );
  }

  // Show full number without decimals
  if (value >= 10_000) {
    return (
      formatNumber(value, {
        maximumFractionDigits: MaximumFractionDigits.None,
        notation: 'standard',
      }) + suffix
    );
  }

  // Show full number with 4 decimals
  return (
    formatNumber(value, {
      maximumFractionDigits: MaximumFractionDigits.Standard,
      notation: 'standard',
    }) + suffix
  );
};

export const truncateExtraDecimals = (amount: string, decimals: number) => {
  const wholePart = amount.split('.')[0] ?? '';
  const decimalPart = amount.split('.')[1];

  if (typeof decimalPart === 'undefined') {
    return amount;
  }

  if (decimals <= 0) {
    return wholePart;
  }

  return `${wholePart}.${decimalPart.slice(0, decimals)}`;
};

/**
 * Normalizes an amount string to prevent parseUnits errors when user types too many decimals.
 * Truncates the fractional part to the maximum allowed decimals for the token.
 * @param amount - The amount string to normalize (e.g., "1.123456789")
 * @param decimals - Maximum number of decimal places allowed
 * @returns Normalized amount string safe for parseUnits
 */
export const normalizeAmountForParseUnits = (amount: string, decimals: number): string => {
  const parsedAmount = Number(amount);
  if (!amount || !Number.isFinite(parsedAmount) || parsedAmount <= 0) {
    return '0';
  }

  const trimmedAmount = amount.trim();
  const truncated = truncateExtraDecimals(trimmedAmount, Math.max(0, decimals));
  return truncated.endsWith('.') ? truncated.slice(0, -1) : truncated;
};
