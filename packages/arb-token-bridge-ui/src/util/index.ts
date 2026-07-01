export const sanitizeImageSrc = (url: string): string => {
  if (url.startsWith('ipfs')) {
    return `https://ipfs.io/ipfs/${url.substring(7)}`;
  }

  return url;
};

export const loadEnvironmentVariableWithFallback = ({
  env,
  fallback,
}: {
  env?: string;
  fallback?: string;
}): string => {
  const isValidEnv = (value?: string) => {
    return typeof value === 'string' && value.trim().length !== 0;
  };
  if (isValidEnv(env)) {
    return String(env);
  }
  if (isValidEnv(fallback)) {
    return String(fallback);
  }
  throw new Error(
    `
      Neither the provided value or its fallback are a valid environment variable.
      Expected one of them to be a non-empty string but received env: '${env}', fallback: '${fallback}'.
    `,
  );
};

export const sanitizeQueryParams = (data: any) => {
  return JSON.parse(JSON.stringify(data));
};

export const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null;
};

export const getAPIBaseUrl = () => {
  // if dev environment, eg. tests, then prepend actual running environment
  // Resolves: next-js-error-only-absolute-urls-are-supported in test:ci
  return process.env.NODE_ENV === 'test' ? 'http://localhost:3000' : '';
};

// add feature flags to the array
const featureFlags: readonly string[] = [];

export const isExperimentalFeatureEnabled = (flag: string) => {
  // only allowlisted flags can be enabled, consistent with sanitizeExperimentalFeaturesQueryParam
  if (!featureFlags.includes(flag)) {
    return false;
  }

  const query = new URLSearchParams(window.location.search);
  const flags = query.get('experiments');

  if (!flags) {
    return false;
  }

  return flags.split(',').includes(flag);
};

export const isExperimentalModeEnabled = () => {
  const query = new URLSearchParams(window.location.search);
  const flags = query.get('experiments');

  return flags !== null;
};

export const sanitizeExperimentalFeaturesQueryParam = (flags: string | null | undefined) => {
  if (!flags) {
    return undefined;
  }

  const flagsArray = flags.split(',');

  if (flagsArray.length === 0) {
    return undefined;
  }

  const validFlagsArray = flagsArray.filter((f) => featureFlags.includes(f));

  if (validFlagsArray.length === 0) {
    return undefined;
  }

  return validFlagsArray.join(',');
};

export const getCurrentExperimentsQueryParam = () => {
  if (typeof window === 'undefined') {
    return undefined;
  }

  const query = new URLSearchParams(window.location.search);
  return sanitizeExperimentalFeaturesQueryParam(query.get('experiments'));
};
