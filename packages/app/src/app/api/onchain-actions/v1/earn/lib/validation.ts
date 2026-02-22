import { isAddress } from 'viem';

import { OPPORTUNITY_CATEGORIES, type OpportunityCategory } from '@/app-types/earn/vaults';

import {
  ALLOWED_HISTORICAL_RANGES,
  EARN_NETWORKS,
  type EarnNetwork,
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

  const normalizedCategory = normalized.toLowerCase();

  if (!OPPORTUNITY_CATEGORIES.includes(normalizedCategory as OpportunityCategory)) {
    throw new ValidationError(
      'INVALID_CATEGORY',
      `Invalid category: ${normalized}. Must be one of: ${OPPORTUNITY_CATEGORIES.join(', ')}`,
    );
  }

  return normalizedCategory as OpportunityCategory;
}

export function parseOptionalOpportunityCategory(
  rawValue: string | null,
): OpportunityCategory | undefined {
  if (!normalizeQueryValue(rawValue)) {
    return undefined;
  }
  return parseOpportunityCategory(rawValue);
}

export function parseEarnNetwork(rawValue: string | null, fallback: EarnNetwork = 'arbitrum') {
  const normalized = normalizeQueryValue(rawValue)?.toLowerCase();
  if (!normalized) {
    return fallback;
  }

  if (!EARN_NETWORKS.includes(normalized as EarnNetwork)) {
    throw new ValidationError(
      'INVALID_NETWORK',
      `network must be one of: ${EARN_NETWORKS.join(', ')}`,
    );
  }

  return normalized as EarnNetwork;
}

export function assertAddress(value: string | null, field: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new ValidationError(`MISSING_${field.toUpperCase()}`, `${field} is required`);
  }

  const normalized = value.trim();

  if (!isAddress(normalized)) {
    throw new ValidationError(
      `INVALID_${field.toUpperCase()}`,
      `${field} must be a valid Ethereum address`,
    );
  }

  return normalized;
}

export function assertOptionalAddress(value: string | null | undefined, field: string) {
  if (value === null || value === undefined) {
    return undefined;
  }

  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new ValidationError(
      `INVALID_${field.toUpperCase()}`,
      `${field} must be a valid Ethereum address`,
    );
  }

  const normalized = value.trim();

  if (!isAddress(normalized)) {
    throw new ValidationError(
      `INVALID_${field.toUpperCase()}`,
      `${field} must be a valid Ethereum address`,
    );
  }

  return normalized;
}

export function parseOptionalNumber(
  rawValue: string | null,
  config: { field: string; code: string; min?: number; max?: number; integer?: boolean },
): number | undefined {
  const normalized = normalizeQueryValue(rawValue);
  if (normalized === undefined) {
    return undefined;
  }

  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) {
    throw new ValidationError(config.code, `${config.field} must be a valid number`);
  }

  if (config.integer && !Number.isInteger(parsed)) {
    throw new ValidationError(config.code, `${config.field} must be an integer`);
  }

  if (config.min !== undefined && parsed < config.min) {
    throw new ValidationError(config.code, `${config.field} must be >= ${config.min}`);
  }

  if (config.max !== undefined && parsed > config.max) {
    throw new ValidationError(config.code, `${config.field} must be <= ${config.max}`);
  }

  return parsed;
}

export function assertPositiveNumberString(rawValue: string | null, field: string): string {
  if (!rawValue) {
    throw new ValidationError(`MISSING_${field.toUpperCase()}`, `${field} is required`);
  }

  const parsed = Number(rawValue);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new ValidationError(`INVALID_${field.toUpperCase()}`, `${field} must be > 0`);
  }

  return rawValue;
}

export function parseHistoricalRange(rawValue: string | null): HistoricalTimeRange {
  const normalized = normalizeQueryValue(rawValue)?.toLowerCase();
  if (!normalized) {
    return '7d';
  }

  if (!ALLOWED_HISTORICAL_RANGES.includes(normalized as HistoricalTimeRange)) {
    throw new ValidationError(
      'INVALID_RANGE',
      `range must be one of: ${ALLOWED_HISTORICAL_RANGES.join(', ')}`,
    );
  }

  return normalized as HistoricalTimeRange;
}

export function assertPlainObject(value: unknown, field: string = 'body'): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new ValidationError('INVALID_BODY', `${field} must be an object`);
  }

  return value as Record<string, unknown>;
}

export function assertOptionalBoolean(value: unknown, field: string): boolean | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== 'boolean') {
    throw new ValidationError(`INVALID_${field.toUpperCase()}`, `${field} must be a boolean`);
  }
  return value;
}

export function assertOptionalFiniteNumber(
  value: unknown,
  config: { field: string; min?: number; max?: number },
): number | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new ValidationError(
      `INVALID_${config.field.toUpperCase()}`,
      `${config.field} must be a valid number`,
    );
  }

  if (config.min !== undefined && value < config.min) {
    throw new ValidationError(
      `INVALID_${config.field.toUpperCase()}`,
      `${config.field} must be >= ${config.min}`,
    );
  }

  if (config.max !== undefined && value > config.max) {
    throw new ValidationError(
      `INVALID_${config.field.toUpperCase()}`,
      `${config.field} must be <= ${config.max}`,
    );
  }

  return value;
}
