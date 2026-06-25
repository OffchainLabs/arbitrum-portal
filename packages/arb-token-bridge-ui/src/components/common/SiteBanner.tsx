'use client';

import dayjs from 'dayjs';
import useSWR from 'swr';

import { ArbitrumStatusResponse } from '@/bridge/app/api/status';
import { NOVA_EXPLORER_URL } from '@/portal/common/constants';

import { getAPIBaseUrl } from '../../util';
import { ExternalLink } from './ExternalLink';

const SiteBannerNovaArbiscan = () => {
  return (
    <div className="bg-orange-dark px-4 py-[8px] text-center text-sm font-normal text-white">
      <div className="w-full">
        <p>
          <ExternalLink
            className="arb-hover underline"
            href="https://forum.arbitrum.foundation/t/updated-tooling-for-arbitrum-nova-in-2026/30430"
          >
            Nova Arbiscan has been discontinued
          </ExternalLink>
          . Please use{' '}
          <ExternalLink className="arb-hover underline" href={NOVA_EXPLORER_URL}>
            Blockscout explorer
          </ExternalLink>{' '}
          for Arbitrum Nova.
        </p>
      </div>
    </div>
  );
};

const SiteBannerArbiscanIncident = ({ type }: { type: 'arbitrum-one' | 'arbitrum-nova' }) => {
  const isArbitrumOne = type === 'arbitrum-one';

  const chainName = isArbitrumOne ? 'Arbitrum One' : 'Arbitrum Nova';
  const explorerUrl = isArbitrumOne ? 'https://arbiscan.io/' : 'https://nova.arbiscan.io/';
  const explorerTitle = isArbitrumOne ? 'Arbiscan' : 'Nova Arbiscan';
  const alternativeExplorerUrl = isArbitrumOne
    ? 'https://www.oklink.com/arbitrum'
    : NOVA_EXPLORER_URL;

  return (
    <div className="bg-orange-dark px-4 py-[8px] text-center text-sm font-normal text-white">
      <div className="w-full">
        <p>
          <ExternalLink className="arb-hover underline" href={explorerUrl}>
            {explorerTitle}
          </ExternalLink>{' '}
          is temporarily facing some issues while showing the latest data. {chainName} is still live
          and running.{' '}
          {alternativeExplorerUrl ? (
            <>
              If you need an alternative block explorer, you can visit{' '}
              <ExternalLink className="arb-hover underline" href={alternativeExplorerUrl}>
                here
              </ExternalLink>
              .
            </>
          ) : null}
        </p>
      </div>
    </div>
  );
};

const SiteBannerCctpSubgraphIncident = () => {
  return (
    <div className="bg-orange-dark px-4 py-[8px] text-center text-sm font-normal text-white">
      <div className="w-full">
        <p>
          Due to an issue with third-party indexers, CCTP (USDC) transactions may not appear here
          right now. Your funds are safe and transfers are still being processed as normal.
        </p>
      </div>
    </div>
  );
};

function isComponentArbiscanOne({ name }: { name: string }) {
  const componentNameLowercased = name.toLowerCase();
  return componentNameLowercased === 'arb1 - arbiscan';
}

function isComponentArbiscanNova({ name }: { name: string }) {
  const componentNameLowercased = name.toLowerCase();
  return componentNameLowercased === 'nova - arbiscan';
}

function isComponentOperational({ status }: { status: string }) {
  return status === 'OPERATIONAL';
}

// Helper functions to check incident banners
function getShowArbiscanOneIncidentBanner(
  arbitrumStatus: ArbitrumStatusResponse | null | undefined,
): boolean {
  if (!arbitrumStatus?.content?.components) return false;
  return arbitrumStatus.content.components.some(
    (component) => isComponentArbiscanOne(component) && !isComponentOperational(component),
  );
}

function getShowArbiscanNovaIncidentBanner(
  arbitrumStatus: ArbitrumStatusResponse | null | undefined,
): boolean {
  if (!arbitrumStatus?.content?.components) return false;
  return arbitrumStatus.content.components.some(
    (component) => isComponentArbiscanNova(component) && !isComponentOperational(component),
  );
}

function getShowInfoBanner(children?: React.ReactNode, expiryDate?: string): boolean {
  if (!children) return false;
  if (!expiryDate) return true;
  return dayjs.utc().isBefore(dayjs(expiryDate).utc(true));
}

// Manual toggle for the CCTP subgraph incident banner. We deploy the CCTP v1
// Ethereum subgraph, but it's served by third-party indexers (not part of our
// status API), so this is flipped on/off by hand. Set `enabled` to false (or
// let `expiryDate` pass) once the indexers are back in sync.
const CCTP_SUBGRAPH_INCIDENT = {
  enabled: true,
  expiryDate: '2026-07-02', // date in utc — auto-hides after this as a safety net
};

function getShowCctpSubgraphBanner(): boolean {
  if (!CCTP_SUBGRAPH_INCIDENT.enabled) return false;
  return dayjs.utc().isBefore(dayjs(CCTP_SUBGRAPH_INCIDENT.expiryDate).utc(true));
}

async function fetchArbitrumStatus(): Promise<ArbitrumStatusResponse> {
  const response = await fetch(`${getAPIBaseUrl()}/api/status`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch Arbitrum status: ${response.status}`);
  }

  const data = await response.json();

  if (!data?.data) {
    throw new Error('Invalid response format from status API');
  }

  return data.data as ArbitrumStatusResponse;
}

function useArbitrumStatus() {
  return useSWR<ArbitrumStatusResponse>(`${getAPIBaseUrl()}/api/status`, fetchArbitrumStatus, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    dedupingInterval: 60000,
  });
}

export function useSiteBannerVisible(): boolean {
  const { data: arbitrumStatus, error } = useArbitrumStatus();

  // CCTP incident is a manual toggle, independent of the status API.
  if (getShowCctpSubgraphBanner()) {
    return true;
  }

  if (error) {
    return false;
  }

  const showArbiscanOneIncidentBanner = getShowArbiscanOneIncidentBanner(arbitrumStatus);
  const showArbiscanNovaIncidentBanner = getShowArbiscanNovaIncidentBanner(arbitrumStatus);

  return showArbiscanOneIncidentBanner || showArbiscanNovaIncidentBanner;
}

export const SiteBanner = ({
  children,
  expiryDate, // date in utc
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { expiryDate?: string }) => {
  const { data: arbitrumStatus, error } = useArbitrumStatus();

  // CCTP incident is a manual toggle, independent of the status API.
  if (getShowCctpSubgraphBanner()) {
    return <SiteBannerCctpSubgraphIncident />;
  }

  if (error) {
    return null;
  }

  const showArbiscanOneIncidentBanner = getShowArbiscanOneIncidentBanner(arbitrumStatus);
  const showArbiscanNovaIncidentBanner = getShowArbiscanNovaIncidentBanner(arbitrumStatus);
  const showInfoBanner = getShowInfoBanner(children, expiryDate);

  if (showArbiscanOneIncidentBanner) {
    return <SiteBannerArbiscanIncident type="arbitrum-one" />;
  }

  if (showArbiscanNovaIncidentBanner) {
    return <SiteBannerNovaArbiscan />;
  }

  if (!showInfoBanner) {
    return null;
  }

  return (
    <div
      className="bg-gradientCelebration px-4 py-[8px] text-center text-sm font-normal text-white"
      {...props}
    >
      <div className="w-full">{children}</div>
    </div>
  );
};
