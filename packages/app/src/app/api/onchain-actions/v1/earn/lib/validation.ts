import { isAddress } from 'viem';
import { z } from 'zod';

import { OPPORTUNITY_CATEGORIES, type OpportunityCategory } from '@/app-types/earn/vaults';

import {
  ALLOWED_HISTORICAL_RANGES,
  EARN_CHAIN_IDS,
  type EarnChainId,
  type HistoricalTimeRange,
} from '../types';

export class ValidationError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, message: string, status: number = 400) {
    super(message);
    this.name = 'ValidationError';
    this.code = code;
    this.status = status;
  }
}

const opportunityCategorySchema = z
  .string()
  .trim()
  .toLowerCase()
  .refine(
    (value): value is OpportunityCategory =>
      OPPORTUNITY_CATEGORIES.includes(value as OpportunityCategory),
    {
      message: `Must be one of: ${OPPORTUNITY_CATEGORIES.join(', ')}`,
    },
  )
  .transform((value) => value as OpportunityCategory);

const earnChainIdSchema = z.coerce
  .number()
  .int()
  .refine((value): value is EarnChainId => EARN_CHAIN_IDS.includes(value as EarnChainId), {
    message: `Must be one of: ${EARN_CHAIN_IDS.join(', ')}`,
  })
  .transform((value) => value as EarnChainId);

const historicalRangeSchema = z
  .string()
  .trim()
  .toLowerCase()
  .refine(
    (value): value is HistoricalTimeRange =>
      ALLOWED_HISTORICAL_RANGES.includes(value as HistoricalTimeRange),
    {
      message: `Must be one of: ${ALLOWED_HISTORICAL_RANGES.join(', ')}`,
    },
  )
  .transform((value) => value as HistoricalTimeRange);

const addressSchema = z
  .string()
  .trim()
  .min(1, { message: 'Value is required' })
  .refine((value) => isAddress(value), {
    message: 'Must be a valid Ethereum address',
  });

const plainObjectSchema = z.object({}).passthrough();
const nonEmptyStringSchema = z.string().trim().min(1, { message: 'Value is required' });
const assetSymbolSchema = z
  .string()
  .trim()
  .max(64, { message: 'assetSymbol must be at most 64 characters' })
  .refine((value) => !/[\u0000-\u001F\u007F]/u.test(value), {
    message: 'assetSymbol contains invalid characters',
  });

function normalizeQueryValue(rawValue: string | null): string | undefined {
  if (rawValue === null) {
    return undefined;
  }

  const normalized = rawValue.trim();
  return normalized.length > 0 ? normalized : undefined;
}

export function parseOpportunityCategory(rawValue: string | null): OpportunityCategory {
  const normalized = normalizeQueryValue(rawValue);
  if (!normalized) {
    throw new ValidationError('MISSING_CATEGORY', 'category is required');
  }

  const parsed = opportunityCategorySchema.safeParse(normalized);
  if (!parsed.success) {
    throw new ValidationError(
      'INVALID_CATEGORY',
      `Invalid category: ${normalized}. Must be one of: ${OPPORTUNITY_CATEGORIES.join(', ')}`,
    );
  }

  return parsed.data;
}

export function parseOptionalOpportunityCategory(
  rawValue: string | null,
): OpportunityCategory | undefined {
  if (!normalizeQueryValue(rawValue)) {
    return undefined;
  }
  return parseOpportunityCategory(rawValue);
}

export function parseEarnChainId(rawValue: string | null): EarnChainId {
  const normalized = normalizeQueryValue(rawValue);
  if (!normalized) {
    throw new ValidationError('MISSING_CHAIN_ID', 'chainId is required');
  }

  const parsed = earnChainIdSchema.safeParse(normalized);
  if (!parsed.success) {
    throw new ValidationError(
      'INVALID_CHAIN_ID',
      `chainId must be one of: ${EARN_CHAIN_IDS.join(', ')}`,
    );
  }

  return parsed.data;
}

export function parseOptionalEarnChainId(rawValue: string | null): EarnChainId | undefined {
  if (!normalizeQueryValue(rawValue)) {
    return undefined;
  }
  return parseEarnChainId(rawValue);
}

export function assertAddress(value: string | null, field: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new ValidationError(`MISSING_${field.toUpperCase()}`, `${field} is required`);
  }

  const parsed = addressSchema.safeParse(value);
  if (!parsed.success) {
    throw new ValidationError(
      `INVALID_${field.toUpperCase()}`,
      `${field} must be a valid Ethereum address`,
    );
  }

  return parsed.data;
}

export function assertOptionalAddress(value: string | null | undefined, field: string) {
  if (value === null || value === undefined) {
    return undefined;
  }

  const parsed = addressSchema.safeParse(value);
  if (!parsed.success) {
    throw new ValidationError(
      `INVALID_${field.toUpperCase()}`,
      `${field} must be a valid Ethereum address`,
    );
  }

  return parsed.data;
}

export function parseOptionalNumber(
  rawValue: string | null,
  config: { field: string; code: string; min?: number; max?: number; integer?: boolean },
): number | undefined {
  const normalized = normalizeQueryValue(rawValue);
  if (normalized === undefined) {
    return undefined;
  }

  let schema: z.ZodType<number> = z.coerce.number().refine(Number.isFinite, {
    message: `${config.field} must be a valid number`,
  });

  if (config.integer) {
    schema = schema.refine(Number.isInteger, {
      message: `${config.field} must be an integer`,
    });
  }

  if (config.min !== undefined) {
    const min = config.min;
    schema = schema.refine((value) => value >= min, {
      message: `${config.field} must be >= ${min}`,
    });
  }

  if (config.max !== undefined) {
    const max = config.max;
    schema = schema.refine((value) => value <= max, {
      message: `${config.field} must be <= ${max}`,
    });
  }

  const parsed = schema.safeParse(normalized);
  if (!parsed.success) {
    throw new ValidationError(
      config.code,
      parsed.error.issues[0]?.message ?? `${config.field} is invalid`,
    );
  }

  return parsed.data;
}

export function assertPositiveNumberString(rawValue: string | null, field: string): string {
  if (rawValue === null) {
    throw new ValidationError(`MISSING_${field.toUpperCase()}`, `${field} is required`);
  }

  const parsedString = nonEmptyStringSchema.safeParse(rawValue);
  if (!parsedString.success) {
    throw new ValidationError(`MISSING_${field.toUpperCase()}`, `${field} is required`);
  }

  const parsedNumber = z.coerce.number().safeParse(parsedString.data);
  if (!parsedNumber.success || !Number.isFinite(parsedNumber.data) || parsedNumber.data <= 0) {
    throw new ValidationError(`INVALID_${field.toUpperCase()}`, `${field} must be > 0`);
  }

  return parsedString.data;
}

export function parseHistoricalRange(rawValue: string | null): HistoricalTimeRange {
  const normalized = normalizeQueryValue(rawValue);
  if (!normalized) {
    return '7d';
  }

  const parsed = historicalRangeSchema.safeParse(normalized);
  if (!parsed.success) {
    throw new ValidationError(
      'INVALID_RANGE',
      `range must be one of: ${ALLOWED_HISTORICAL_RANGES.join(', ')}`,
    );
  }

  return parsed.data;
}

export function assertPlainObject(value: unknown, field: string = 'body'): Record<string, unknown> {
  const parsed = plainObjectSchema.safeParse(value);
  if (!parsed.success) {
    throw new ValidationError('INVALID_BODY', `${field} must be an object`);
  }

  return parsed.data;
}

export function assertOptionalBoolean(value: unknown, field: string): boolean | undefined {
  const parsed = z.boolean().optional().safeParse(value);
  if (!parsed.success) {
    throw new ValidationError(`INVALID_${field.toUpperCase()}`, `${field} must be a boolean`);
  }

  return parsed.data;
}

export function assertOptionalFiniteNumber(
  value: unknown,
  config: { field: string; min?: number; max?: number },
): number | undefined {
  let schema: z.ZodType<number | undefined> = z.number().finite().optional();

  if (config.min !== undefined) {
    const min = config.min;
    schema = schema.refine((v) => v === undefined || v >= min, {
      message: `${config.field} must be >= ${min}`,
    });
  }
  if (config.max !== undefined) {
    const max = config.max;
    schema = schema.refine((v) => v === undefined || v <= max, {
      message: `${config.field} must be <= ${max}`,
    });
  }

  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    throw new ValidationError(
      `INVALID_${config.field.toUpperCase()}`,
      parsed.error.issues[0]?.message ?? `${config.field} must be a valid number`,
    );
  }

  return parsed.data;
}

export function assertString(value: unknown, field: string): string {
  if (value === null || value === undefined) {
    throw new ValidationError(`MISSING_${field.toUpperCase()}`, `${field} is required`);
  }

  const parsed = nonEmptyStringSchema.safeParse(value);
  if (!parsed.success) {
    throw new ValidationError(`INVALID_${field.toUpperCase()}`, `${field} must be a string`);
  }

  return parsed.data;
}

export function assertOptionalString(value: unknown, field: string): string | undefined {
  const parsed = z.string().optional().safeParse(value);
  if (!parsed.success) {
    throw new ValidationError(`INVALID_${field.toUpperCase()}`, `${field} must be a string`);
  }

  const normalized = parsed.data?.trim();
  return normalized && normalized.length > 0 ? normalized : undefined;
}

export function parseOptionalAssetSymbol(rawValue: string | null): string | undefined {
  const normalized = normalizeQueryValue(rawValue);
  if (normalized === undefined) {
    return undefined;
  }

  const parsed = assetSymbolSchema.safeParse(normalized);
  if (!parsed.success) {
    throw new ValidationError(
      'INVALID_ASSET_SYMBOL',
      parsed.error.issues[0]?.message ?? 'assetSymbol is invalid',
    );
  }

  return parsed.data;
}

export function assertString(value: unknown, field: string): string {
  if (typeof value !== 'string') {
    throw new ValidationError(`INVALID_${field.toUpperCase()}`, `${field} must be a string`);
  }

  const normalized = value.trim();
  if (normalized.length === 0) {
    throw new ValidationError(`MISSING_${field.toUpperCase()}`, `${field} is required`);
  }

  return normalized;
}

export function assertOptionalString(value: unknown, field: string): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== 'string') {
    throw new ValidationError(`INVALID_${field.toUpperCase()}`, `${field} must be a string`);
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}
