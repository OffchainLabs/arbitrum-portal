/* eslint-disable no-console */
export type LogLevel = 'silent' | 'error' | 'warn' | 'info' | 'debug';

export const LOG_LEVELS: LogLevel[] = ['silent', 'error', 'warn', 'info', 'debug'];

const LEVELS: Record<LogLevel, number> = {
  silent: 0,
  error: 1,
  warn: 2,
  info: 3,
  debug: 4,
};

function isLogLevel(value: string): value is LogLevel {
  return LOG_LEVELS.includes(value as LogLevel);
}

function getLevel(): LogLevel {
  if (typeof window !== 'undefined') {
    const param = new URLSearchParams(window.location.search).get('debugLevel');
    if (param && isLogLevel(param)) return param;
  }

  if (process.env.NODE_ENV === 'development') return 'warn';

  // Production default
  return 'silent';
}

function shouldLog(level: LogLevel): boolean {
  return LEVELS[level] <= LEVELS[getLevel()];
}

export const logger = {
  debug: (...args: unknown[]) => {
    if (shouldLog('debug')) console.debug(...args);
  },
  info: (...args: unknown[]) => {
    if (shouldLog('info')) console.log(...args);
  },
  warn: (...args: unknown[]) => {
    if (shouldLog('warn')) console.warn(...args);
  },
  error: (...args: unknown[]) => {
    if (shouldLog('error')) console.error(...args);
  },
};
