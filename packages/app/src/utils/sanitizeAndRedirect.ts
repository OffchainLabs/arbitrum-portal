import { constants } from 'ethers';
import { redirect } from 'next/navigation';

import { ChainId } from '@/bridge/types/ChainId';
import { sanitizeExperimentalFeaturesQueryParam } from '@/bridge/util';
import { isE2eTestingEnvironment, isProductionEnvironment } from '@/bridge/util/CommonUtils';
import { logger } from '@/bridge/util/logger';
import { registerLocalNetwork } from '@/bridge/util/networks';
import {
  DisabledFeaturesParam,
  decodeChainQueryParam,
  encodeChainQueryParam,
  encodeString,
  sanitizeQueryParams,
  sanitizeTabQueryParam,
  sanitizeTokenQueryParam,
} from '@/bridge/util/queryParamUtils';

function getDestinationWithSanitizedQueryParams(
  sanitized: {
    sourceChainId: number;
    destinationChainId: number;
    experiments: string | undefined;
    token: string | undefined | null;
    destinationToken: string | undefined | null;
    tab: string;
    disabledFeatures: string[] | undefined;
  },
  query: Record<string, string | string[] | undefined>,
  baseUrl: string,
) {
  const params = new URLSearchParams();

  for (const key in query) {
    // don't copy "sourceChain" and "destinationChain" query params
    if (
      key === 'sourceChain' ||
      key === 'destinationChain' ||
      key === 'experiments' ||
      key === 'token' ||
      key === 'destinationToken' ||
      key === 'tab' ||
      key === 'disabledFeatures'
    ) {
      continue;
    }

    const value = query[key];

    // copy everything else
    if (typeof value === 'string') {
      params.set(key, value);
    }
  }

  const encodedSource = encodeChainQueryParam(sanitized.sourceChainId);
  const encodedDestination = encodeChainQueryParam(sanitized.destinationChainId);
  const encodedExperiments = encodeString(sanitized.experiments);
  const encodedToken = encodeString(sanitized.token);
  const encodedDestinationToken = encodeString(sanitized.destinationToken);
  const encodedTab = encodeString(sanitized.tab);

  if (encodedSource) {
    params.set('sourceChain', encodedSource);

    if (encodedDestination) {
      params.set('destinationChain', encodedDestination);
    }
  }

  if (encodedExperiments) {
    params.set('experiments', encodedExperiments);
  }

  if (encodedToken) {
    params.set('token', encodedToken);
  }

  if (encodedDestinationToken) {
    params.set('destinationToken', encodedDestinationToken);
  }

  if (encodedTab) {
    params.set('tab', encodedTab);
  }

  if (sanitized.disabledFeatures) {
    for (const disabledFeature of sanitized.disabledFeatures) {
      params.append('disabledFeatures', disabledFeature);
    }
  }

  // Run sanitization only once per session
  params.set('sanitized', 'true');

  return `${baseUrl}?${params.toString()}`;
}

export async function sanitizeAndRedirect(
  searchParams: {
    [key: string]: string | string[] | undefined;
  },
  baseUrl: string,
) {
  const redirectPath = await getSanitizedRedirectPath(searchParams, baseUrl);

  if (redirectPath) {
    redirect(redirectPath);
  }
}

export async function getSanitizedRedirectPath(
  searchParams: {
    [key: string]: string | string[] | undefined;
  },
  baseUrl: string,
) {
  const sourceChainId = decodeChainQueryParam(searchParams.sourceChain);
  const destinationChainId = decodeChainQueryParam(searchParams.destinationChain);
  const experiments =
    typeof searchParams.experiments === 'string' ? searchParams.experiments : undefined;
  const token = typeof searchParams.token === 'string' ? searchParams.token : undefined;
  const destinationToken =
    typeof searchParams.destinationToken === 'string' ? searchParams.destinationToken : undefined;
  const tab = typeof searchParams.tab === 'string' ? searchParams.tab : undefined;
  const disabledFeatures =
    typeof searchParams.disabledFeatures === 'string'
      ? [searchParams.disabledFeatures]
      : searchParams.disabledFeatures;

  // If both sourceChain and destinationChain are not present, let the client sync with Metamask
  if (!sourceChainId && !destinationChainId) {
    return null;
  }

  if (!isProductionEnvironment || isE2eTestingEnvironment) {
    await registerLocalNetwork();
  }

  const sanitizedChainIds = sanitizeQueryParams({
    sourceChainId,
    destinationChainId,
  });
  const sanitizedToken = sanitizeTokenQueryParam({
    token,
    sourceChainId: sanitizedChainIds.sourceChainId,
    destinationChainId: sanitizedChainIds.destinationChainId,
  });
  let sanitizedDestinationToken = sanitizeTokenQueryParam({
    token: destinationToken,
    sourceChainId: sanitizedChainIds.sourceChainId,
    destinationChainId: sanitizedChainIds.destinationChainId,
  });

  // Reuse the same default selection behavior as setSelectedToken(null) for ApeChain -> Superposition.
  if (
    sanitizedChainIds.sourceChainId === ChainId.ApeChain &&
    sanitizedChainIds.destinationChainId === ChainId.Superposition &&
    typeof token === 'undefined' &&
    typeof destinationToken === 'undefined'
  ) {
    sanitizedDestinationToken = constants.AddressZero;
  }

  const sanitized = {
    ...sanitizedChainIds,
    experiments: sanitizeExperimentalFeaturesQueryParam(experiments),
    token: sanitizedToken,
    destinationToken: sanitizedDestinationToken,
    tab: sanitizeTabQueryParam(tab),
    disabledFeatures: DisabledFeaturesParam.decode(disabledFeatures),
  };

  // if the sanitized query params are different from the initial values, redirect to the url with sanitized query params
  if (
    sourceChainId !== sanitized.sourceChainId ||
    destinationChainId !== sanitized.destinationChainId ||
    experiments !== sanitized.experiments ||
    token !== sanitized.token ||
    destinationToken !== sanitized.destinationToken ||
    tab !== sanitized.tab ||
    (disabledFeatures?.length || 0) !== (sanitized.disabledFeatures?.length || 0)
  ) {
    logger.debug(`[sanitizeAndRedirect] sanitizing query params`);
    logger.debug(
      `[sanitizeAndRedirect]     sourceChain=${sourceChainId}&destinationChain=${destinationChainId}&experiments=${experiments}&token=${token}&destinationToken=${destinationToken}&tab=${tab}&disabledFeatures=${disabledFeatures} (before)`,
    );
    logger.debug(
      `[sanitizeAndRedirect]     sourceChain=${sanitized.sourceChainId}&destinationChain=${sanitized.destinationChainId}&experiments=${sanitized.experiments}&token=${sanitized.token}&destinationToken=${sanitized.destinationToken}&tab=${sanitized.tab}&disabledFeatures=${sanitized.disabledFeatures}&sanitized=true (after)`,
    );

    return getDestinationWithSanitizedQueryParams(sanitized, searchParams, baseUrl);
  }

  return null;
}
