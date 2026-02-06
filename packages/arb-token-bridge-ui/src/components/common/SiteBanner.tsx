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
function getShowArbiscanOneIncidentBanner(arbitrumStatus: ArbitrumStatusResponse): boolean {
  return arbitrumStatus.content.components.some(
    (component) => isComponentArbiscanOne(component) && !isComponentOperational(component),
  );
}

function getShowArbiscanNovaIncidentBanner(arbitrumStatus: ArbitrumStatusResponse): boolean {
  return arbitrumStatus.content.components.some(
    (component) => isComponentArbiscanNova(component) && !isComponentOperational(component),
  );
}

function getShowInfoBanner(children?: React.ReactNode, expiryDate?: string): boolean {
  if (!children) return false;
  if (!expiryDate) return true;
  return dayjs.utc().isBefore(dayjs(expiryDate).utc(true));
}

async function fetchArbitrumStatus(): Promise<ArbitrumStatusResponse> {
  const response = await fetch(`${getAPIBaseUrl()}/api/status`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
  const data = await response.json();
  return data.data as ArbitrumStatusResponse;
}

function useArbitrumStatus() {
  const { data, error } = useSWR<ArbitrumStatusResponse>(
    `${getAPIBaseUrl()}/api/status`,
    fetchArbitrumStatus,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 60000,
    },
  );

  if (error) {
    console.error('Error fetching Arbitrum status:', error);
    return { content: { components: [] } };
  }

  return data || { content: { components: [] } };
}

export function useSiteBannerVisible({
  children,
  expiryDate,
}: {
  children?: React.ReactNode;
  expiryDate?: string;
} = {}): boolean {
  const arbitrumStatus = useArbitrumStatus();

  const showArbiscanOneIncidentBanner = getShowArbiscanOneIncidentBanner(arbitrumStatus);
  const showArbiscanNovaIncidentBanner = getShowArbiscanNovaIncidentBanner(arbitrumStatus);
  const showInfoBanner = getShowInfoBanner(children, expiryDate);

  return showArbiscanOneIncidentBanner || showArbiscanNovaIncidentBanner || showInfoBanner;
}

export const SiteBanner = ({
  children,
  expiryDate, // date in utc
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { expiryDate?: string }) => {
  const arbitrumStatus = useArbitrumStatus();

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
