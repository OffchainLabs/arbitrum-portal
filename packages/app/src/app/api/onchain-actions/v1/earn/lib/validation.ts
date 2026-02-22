import { isAddress } from 'viem';

import { OPPORTUNITY_CATEGORIES, type OpportunityCategory } from '@/app-types/earn/vaults';

import { ALLOWED_HISTORICAL_RANGES, type HistoricalTimeRange } from '../types';

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

export const ALLOWED_EARN_NETWORKS = ['arbitrum', 'mainnet'] as const;
export type EarnNetwork = (typeof ALLOWED_EARN_NETWORKS)[number];

export function parseOpportunityCategory(rawValue: string | null): OpportunityCategory {
  if (!rawValue) {
    throw new ValidationError('MISSING_CATEGORY', 'category is required');
  }

  if (!OPPORTUNITY_CATEGORIES.includes(rawValue as OpportunityCategory)) {
    throw new ValidationError(
      'INVALID_CATEGORY',
      `Invalid category: ${rawValue}. Must be one of: ${OPPORTUNITY_CATEGORIES.join(', ')}`,
    );
  }

  return rawValue as OpportunityCategory;
}

export function parseOptionalOpportunityCategory(
  rawValue: string | null,
): OpportunityCategory | undefined {
  if (!rawValue) {
    return undefined;
  }
  return parseOpportunityCategory(rawValue);
}

export function parseEarnNetwork(rawValue: string | null, fallback: EarnNetwork = 'arbitrum') {
  if (!rawValue) {
    return fallback;
  }

  if (!ALLOWED_EARN_NETWORKS.includes(rawValue as EarnNetwork)) {
    throw new ValidationError(
      'INVALID_NETWORK',
      `network must be one of: ${ALLOWED_EARN_NETWORKS.join(', ')}`,
    );
  }

  return rawValue as EarnNetwork;
}

export function assertAddress(value: string | null, field: string): string {
  if (!value) {
    throw new ValidationError(`MISSING_${field.toUpperCase()}`, `${field} is required`);
  }

  if (!isAddress(value)) {
    throw new ValidationError(
      `INVALID_${field.toUpperCase()}`,
      `${field} must be a valid Ethereum address`,
    );
  }

  return value;
}

export function assertOptionalAddress(value: string | null | undefined, field: string) {
  if (!value) {
    return undefined;
  }

  if (!isAddress(value)) {
    throw new ValidationError(
      `INVALID_${field.toUpperCase()}`,
      `${field} must be a valid Ethereum address`,
    );
  }

  return value;
}

export function parseOptionalNumber(
  rawValue: string | null,
  config: { field: string; code: string; min?: number; max?: number; integer?: boolean },
): number | undefined {
  if (rawValue === null) {
    return undefined;
  }

  const parsed = Number(rawValue);
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
  if (!rawValue) {
    return '7d';
  }

  if (!ALLOWED_HISTORICAL_RANGES.includes(rawValue as HistoricalTimeRange)) {
    throw new ValidationError(
      'INVALID_RANGE',
      `range must be one of: ${ALLOWED_HISTORICAL_RANGES.join(', ')}`,
    );
  }

  return rawValue as HistoricalTimeRange;
}
