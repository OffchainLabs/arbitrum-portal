import { describe, expect, it } from 'vitest';

import {
  ValidationError,
  assertAddress,
  assertOptionalAddress,
  assertOptionalBoolean,
  assertOptionalFiniteNumber,
  assertOptionalString,
  assertPlainObject,
  assertPositiveNumberString,
  assertString,
  parseEarnChainId,
  parseHistoricalRange,
  parseOpportunityCategory,
  parseOptionalAssetSymbol,
  parseOptionalEarnChainId,
  parseOptionalNumber,
  parseOptionalOpportunityCategory,
  parseOptionalTimestamp,
} from './validation';

describe('parseOpportunityCategory', () => {
  it('parses a valid category', () => {
    expect(parseOpportunityCategory('lend')).toBe('lend');
    expect(parseOpportunityCategory('liquid-staking')).toBe('liquid-staking');
    expect(parseOpportunityCategory('fixed-yield')).toBe('fixed-yield');
  });

  it('trims and lowercases input', () => {
    expect(parseOpportunityCategory('  Lend  ')).toBe('lend');
    expect(parseOpportunityCategory('LIQUID-STAKING')).toBe('liquid-staking');
  });

  it('throws MISSING_CATEGORY for null', () => {
    expect(() => parseOpportunityCategory(null)).toThrow(ValidationError);
    expect(() => parseOpportunityCategory(null)).toThrow('category is required');
  });

  it('throws MISSING_CATEGORY for empty string', () => {
    expect(() => parseOpportunityCategory('')).toThrow(ValidationError);
    expect(() => parseOpportunityCategory('   ')).toThrow(ValidationError);
  });

  it('throws INVALID_CATEGORY for unknown value', () => {
    expect(() => parseOpportunityCategory('staking')).toThrow(ValidationError);
    expect(() => parseOpportunityCategory('staking')).toThrow('Invalid category');
  });
});

describe('parseOptionalOpportunityCategory', () => {
  it('returns undefined for null or empty', () => {
    expect(parseOptionalOpportunityCategory(null)).toBeUndefined();
    expect(parseOptionalOpportunityCategory('')).toBeUndefined();
    expect(parseOptionalOpportunityCategory('   ')).toBeUndefined();
  });

  it('parses valid category', () => {
    expect(parseOptionalOpportunityCategory('lend')).toBe('lend');
  });

  it('throws for invalid non-empty value', () => {
    expect(() => parseOptionalOpportunityCategory('nope')).toThrow(ValidationError);
  });
});

describe('parseEarnChainId', () => {
  it('parses valid chain ids', () => {
    expect(parseEarnChainId('42161')).toBe(42161);
    expect(parseEarnChainId('1')).toBe(1);
  });

  it('throws MISSING_CHAIN_ID for null', () => {
    expect(() => parseEarnChainId(null)).toThrow(ValidationError);
    expect(() => parseEarnChainId(null)).toThrow('chainId is required');
  });

  it('throws INVALID_CHAIN_ID for unsupported chain', () => {
    expect(() => parseEarnChainId('137')).toThrow(ValidationError);
    expect(() => parseEarnChainId('137')).toThrow('chainId must be one of');
  });

  it('throws for non-numeric value', () => {
    expect(() => parseEarnChainId('abc')).toThrow(ValidationError);
  });
});

describe('parseOptionalEarnChainId', () => {
  it('returns undefined for null or empty', () => {
    expect(parseOptionalEarnChainId(null)).toBeUndefined();
    expect(parseOptionalEarnChainId('')).toBeUndefined();
  });

  it('parses valid chain id', () => {
    expect(parseOptionalEarnChainId('42161')).toBe(42161);
  });

  it('throws for invalid non-empty value', () => {
    expect(() => parseOptionalEarnChainId('999')).toThrow(ValidationError);
  });
});

describe('assertAddress', () => {
  const validAddress = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';

  it('returns a valid address', () => {
    expect(assertAddress(validAddress, 'userAddress')).toBe(validAddress);
  });

  it('throws for null', () => {
    expect(() => assertAddress(null, 'userAddress')).toThrow(ValidationError);
    expect(() => assertAddress(null, 'userAddress')).toThrow('userAddress is required');
  });

  it('throws for empty string', () => {
    expect(() => assertAddress('', 'userAddress')).toThrow(ValidationError);
  });

  it('throws for invalid address', () => {
    expect(() => assertAddress('0xinvalid', 'userAddress')).toThrow(ValidationError);
    expect(() => assertAddress('0xinvalid', 'userAddress')).toThrow(
      'must be a valid Ethereum address',
    );
  });
});

describe('assertOptionalAddress', () => {
  const validAddress = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';

  it('returns undefined for null or undefined', () => {
    expect(assertOptionalAddress(null, 'token')).toBeUndefined();
    expect(assertOptionalAddress(undefined, 'token')).toBeUndefined();
  });

  it('returns valid address', () => {
    expect(assertOptionalAddress(validAddress, 'token')).toBe(validAddress);
  });

  it('throws for invalid address', () => {
    expect(() => assertOptionalAddress('not-an-address', 'token')).toThrow(ValidationError);
  });
});

describe('parseOptionalNumber', () => {
  const baseConfig = { field: 'amount', code: 'INVALID_AMOUNT' };

  it('returns undefined for null or empty', () => {
    expect(parseOptionalNumber(null, baseConfig)).toBeUndefined();
    expect(parseOptionalNumber('', baseConfig)).toBeUndefined();
    expect(parseOptionalNumber('   ', baseConfig)).toBeUndefined();
  });

  it('parses a valid number', () => {
    expect(parseOptionalNumber('42', baseConfig)).toBe(42);
    expect(parseOptionalNumber('3.14', baseConfig)).toBe(3.14);
  });

  it('throws for non-numeric value', () => {
    expect(() => parseOptionalNumber('abc', baseConfig)).toThrow(ValidationError);
  });

  it('respects min constraint', () => {
    expect(() => parseOptionalNumber('0', { ...baseConfig, min: 1 })).toThrow(ValidationError);
    expect(parseOptionalNumber('1', { ...baseConfig, min: 1 })).toBe(1);
  });

  it('respects max constraint', () => {
    expect(() => parseOptionalNumber('101', { ...baseConfig, max: 100 })).toThrow(ValidationError);
    expect(parseOptionalNumber('100', { ...baseConfig, max: 100 })).toBe(100);
  });

  it('respects integer constraint', () => {
    expect(() => parseOptionalNumber('3.5', { ...baseConfig, integer: true })).toThrow(
      ValidationError,
    );
    expect(parseOptionalNumber('3', { ...baseConfig, integer: true })).toBe(3);
  });
});

describe('assertPositiveNumberString', () => {
  it('returns the trimmed string for a positive number', () => {
    expect(assertPositiveNumberString('100', 'amount')).toBe('100');
    expect(assertPositiveNumberString('0.5', 'amount')).toBe('0.5');
  });

  it('throws for null', () => {
    expect(() => assertPositiveNumberString(null, 'amount')).toThrow(ValidationError);
    expect(() => assertPositiveNumberString(null, 'amount')).toThrow('amount is required');
  });

  it('throws for empty string', () => {
    expect(() => assertPositiveNumberString('', 'amount')).toThrow(ValidationError);
  });

  it('throws for zero', () => {
    expect(() => assertPositiveNumberString('0', 'amount')).toThrow(ValidationError);
    expect(() => assertPositiveNumberString('0', 'amount')).toThrow('must be > 0');
  });

  it('throws for negative number', () => {
    expect(() => assertPositiveNumberString('-5', 'amount')).toThrow(ValidationError);
  });

  it('throws for non-numeric string', () => {
    expect(() => assertPositiveNumberString('abc', 'amount')).toThrow(ValidationError);
  });
});

describe('parseHistoricalRange', () => {
  it('parses valid ranges', () => {
    expect(parseHistoricalRange('1d')).toBe('1d');
    expect(parseHistoricalRange('7d')).toBe('7d');
    expect(parseHistoricalRange('1m')).toBe('1m');
    expect(parseHistoricalRange('1y')).toBe('1y');
  });

  it('defaults to 7d for null or empty', () => {
    expect(parseHistoricalRange(null)).toBe('7d');
    expect(parseHistoricalRange('')).toBe('7d');
    expect(parseHistoricalRange('   ')).toBe('7d');
  });

  it('trims and lowercases input', () => {
    expect(parseHistoricalRange('  1D  ')).toBe('1d');
  });

  it('throws INVALID_RANGE for unknown value', () => {
    expect(() => parseHistoricalRange('2w')).toThrow(ValidationError);
    expect(() => parseHistoricalRange('2w')).toThrow('range must be one of');
  });
});

describe('parseOptionalTimestamp', () => {
  it('returns undefined for null or empty', () => {
    expect(parseOptionalTimestamp(null, 'from')).toBeUndefined();
    expect(parseOptionalTimestamp('', 'from')).toBeUndefined();
  });

  it('parses a unix timestamp in seconds', () => {
    expect(parseOptionalTimestamp('1700000000', 'from')).toBe(1700000000);
  });

  it('converts millisecond timestamps to seconds', () => {
    expect(parseOptionalTimestamp('1700000000000', 'from')).toBe(1700000000);
  });

  it('parses an ISO date string', () => {
    const result = parseOptionalTimestamp('2024-01-01T00:00:00Z', 'from');
    expect(result).toBe(Math.floor(Date.parse('2024-01-01T00:00:00Z') / 1000));
  });

  it('throws for invalid string', () => {
    expect(() => parseOptionalTimestamp('not-a-date', 'from')).toThrow(ValidationError);
    expect(() => parseOptionalTimestamp('not-a-date', 'from')).toThrow(
      'must be a unix timestamp or ISO datetime',
    );
  });

  it('throws for zero or negative timestamp', () => {
    expect(() => parseOptionalTimestamp('0', 'from')).toThrow(ValidationError);
    expect(() => parseOptionalTimestamp('-100', 'from')).toThrow(ValidationError);
  });
});

describe('assertPlainObject', () => {
  it('returns the object for a valid plain object', () => {
    const obj = { key: 'value' };
    expect(assertPlainObject(obj)).toEqual(obj);
  });

  it('allows empty object', () => {
    expect(assertPlainObject({})).toEqual({});
  });

  it('throws for null', () => {
    expect(() => assertPlainObject(null)).toThrow(ValidationError);
  });

  it('throws for array', () => {
    expect(() => assertPlainObject([1, 2])).toThrow(ValidationError);
  });

  it('throws for string', () => {
    expect(() => assertPlainObject('hello')).toThrow(ValidationError);
  });
});

describe('assertOptionalBoolean', () => {
  it('returns undefined for undefined', () => {
    expect(assertOptionalBoolean(undefined, 'simulate')).toBeUndefined();
  });

  it('returns boolean values', () => {
    expect(assertOptionalBoolean(true, 'simulate')).toBe(true);
    expect(assertOptionalBoolean(false, 'simulate')).toBe(false);
  });

  it('throws for non-boolean', () => {
    expect(() => assertOptionalBoolean('true', 'simulate')).toThrow(ValidationError);
    expect(() => assertOptionalBoolean(1, 'simulate')).toThrow(ValidationError);
  });
});

describe('assertOptionalFiniteNumber', () => {
  const baseConfig = { field: 'minTvl' };

  it('returns undefined for undefined', () => {
    expect(assertOptionalFiniteNumber(undefined, baseConfig)).toBeUndefined();
  });

  it('returns a valid number', () => {
    expect(assertOptionalFiniteNumber(42, baseConfig)).toBe(42);
    expect(assertOptionalFiniteNumber(0, baseConfig)).toBe(0);
  });

  it('throws for non-number', () => {
    expect(() => assertOptionalFiniteNumber('42', baseConfig)).toThrow(ValidationError);
  });

  it('throws for Infinity', () => {
    expect(() => assertOptionalFiniteNumber(Infinity, baseConfig)).toThrow(ValidationError);
  });

  it('throws for NaN', () => {
    expect(() => assertOptionalFiniteNumber(NaN, baseConfig)).toThrow(ValidationError);
  });

  it('respects min constraint', () => {
    expect(() => assertOptionalFiniteNumber(-1, { ...baseConfig, min: 0 })).toThrow(
      ValidationError,
    );
    expect(assertOptionalFiniteNumber(0, { ...baseConfig, min: 0 })).toBe(0);
  });

  it('respects max constraint', () => {
    expect(() => assertOptionalFiniteNumber(101, { ...baseConfig, max: 100 })).toThrow(
      ValidationError,
    );
    expect(assertOptionalFiniteNumber(100, { ...baseConfig, max: 100 })).toBe(100);
  });
});

describe('assertString', () => {
  it('returns a valid string', () => {
    expect(assertString('hello', 'name')).toBe('hello');
  });

  it('throws for null or undefined', () => {
    expect(() => assertString(null, 'name')).toThrow(ValidationError);
    expect(() => assertString(null, 'name')).toThrow('name is required');
    expect(() => assertString(undefined, 'name')).toThrow(ValidationError);
  });

  it('throws for empty string', () => {
    expect(() => assertString('', 'name')).toThrow(ValidationError);
    expect(() => assertString('   ', 'name')).toThrow(ValidationError);
  });

  it('throws for non-string', () => {
    expect(() => assertString(42, 'name')).toThrow(ValidationError);
  });
});

describe('assertOptionalString', () => {
  it('returns undefined for null or undefined', () => {
    expect(assertOptionalString(null, 'desc')).toBeUndefined();
    expect(assertOptionalString(undefined, 'desc')).toBeUndefined();
  });

  it('returns undefined for empty or whitespace-only string', () => {
    expect(assertOptionalString('', 'desc')).toBeUndefined();
    expect(assertOptionalString('   ', 'desc')).toBeUndefined();
  });

  it('returns trimmed string', () => {
    expect(assertOptionalString('  hello  ', 'desc')).toBe('hello');
  });

  it('throws for non-string', () => {
    expect(() => assertOptionalString(42, 'desc')).toThrow(ValidationError);
  });
});

describe('parseOptionalAssetSymbol', () => {
  it('returns undefined for null or empty', () => {
    expect(parseOptionalAssetSymbol(null)).toBeUndefined();
    expect(parseOptionalAssetSymbol('')).toBeUndefined();
  });

  it('returns valid symbol', () => {
    expect(parseOptionalAssetSymbol('USDC')).toBe('USDC');
    expect(parseOptionalAssetSymbol('ETH')).toBe('ETH');
  });

  it('throws for symbol exceeding 64 characters', () => {
    expect(() => parseOptionalAssetSymbol('A'.repeat(65))).toThrow(ValidationError);
  });

  it('throws for symbol with control characters', () => {
    expect(() => parseOptionalAssetSymbol('USDC\x00')).toThrow(ValidationError);
    expect(() => parseOptionalAssetSymbol('US\x01DC')).toThrow(ValidationError);
  });
});

describe('ValidationError', () => {
  it('has correct properties', () => {
    const err = new ValidationError('TEST_CODE', 'test message', 422);
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(ValidationError);
    expect(err.code).toBe('TEST_CODE');
    expect(err.message).toBe('test message');
    expect(err.status).toBe(422);
    expect(err.name).toBe('ValidationError');
  });

  it('defaults status to 400', () => {
    const err = new ValidationError('CODE', 'msg');
    expect(err.status).toBe(400);
  });
});
