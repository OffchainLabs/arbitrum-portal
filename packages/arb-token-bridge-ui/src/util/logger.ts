/* eslint-disable no-console */
type LogLevel = 'silent' | 'error' | 'warn' | 'info' | 'debug';

const LEVELS: Record<LogLevel, number> = {
  silent: 0,
  error: 1,
  warn: 2,
  info: 3,
  debug: 4,
};

function getLevel(): LogLevel {
  // ?debug=true shows everything
  if (typeof window !== 'undefined') {
    const query = new URLSearchParams(window.location.search);
    if (query.get('debug') === 'true') return 'debug';
  }

  if (process.env.NODE_ENV === 'development') return 'warn';

  // Production
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
