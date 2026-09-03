'use client';

import { createConfig } from '@lifi/sdk';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import posthog from 'posthog-js';
import { PostHogProvider } from 'posthog-js/react';
import { PropsWithChildren } from 'react';
import { WagmiProvider } from 'wagmi';

import { TooltipProvider } from '@/app/components/common/Tooltip';
import { LIFI_INTEGRATOR_IDS } from '@/bridge/app/api/crosschain-transfers/lifi';
import { AppContextProvider } from '@/bridge/components/App/AppContext';
import { ArbQueryParamProvider } from '@/bridge/hooks/useArbQueryParams';
import { isE2eTestingEnvironment, isProductionEnvironment } from '@/bridge/util/CommonUtils';
import { registerLocalNetwork } from '@/bridge/util/networks';
import { wagmiConfig } from '@/bridge/util/wagmi/setup';

import { initializeDayjs } from '../../../initialization';

/**
 * Device, locale and timezone properties PostHog collects by default. They are
 * dropped client-side before any event leaves the browser.
 */
const POSTHOG_DEVICE_PROPERTY_DENYLIST = [
  // Hardware and screen
  '$device',
  '$device_type',
  '$device_model',
  '$screen_height',
  '$screen_width',
  '$viewport_height',
  '$viewport_width',
  // OS and browser fingerprint
  '$os',
  '$os_name',
  '$os_version',
  '$browser',
  '$browser_version',
  '$browser_type',
  '$raw_user_agent',
  // Locale and timezone
  '$browser_language',
  '$browser_language_prefix',
  '$timezone',
  '$timezone_offset',
];

/**
 * Catches device properties a future posthog-js may add under a family we already
 * deny above, so the denylist above does not silently go stale on SDK upgrades.
 */
const POSTHOG_DEVICE_PROPERTY_PATTERN =
  /^\$(?:screen|viewport|device|os|browser|timezone|raw_user_agent)/;

const POSTHOG_MASKED_QUERY_PARAMS = ['destinationAddress', 'amount', 'amount2'];

if (typeof process.env.NEXT_PUBLIC_POSTHOG_KEY === 'string') {
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
    api_host: 'https://us.i.posthog.com',
    cookieless_mode: 'always',
    loaded: (posthog) => {
      posthog.register({ $geoip_disable: true });

      if (process.env.NODE_ENV !== 'production') {
        posthog.debug();
      }
    },
    persistence: 'memory',
    autocapture: false,
    disable_session_recording: true,
    capture_heatmaps: false,
    disableDeviceModel: true,
    property_denylist: POSTHOG_DEVICE_PROPERTY_DENYLIST,
    mask_personal_data_properties: true,
    custom_personal_data_properties: POSTHOG_MASKED_QUERY_PARAMS,
    // Runs last, after property_denylist and after $set/$set_once are built.
    // Must never throw: posthog-js drops the event entirely if it does.
    before_send: (event) => {
      if (!event?.properties) {
        return event;
      }

      for (const key of Object.keys(event.properties)) {
        if (POSTHOG_DEVICE_PROPERTY_PATTERN.test(key)) {
          delete event.properties[key];
        }
      }

      return event;
    },
  });
}

const integratorId =
  window.location.pathname === '/bridge/embed'
    ? LIFI_INTEGRATOR_IDS.EMBED
    : LIFI_INTEGRATOR_IDS.NORMAL;

const queryClient = new QueryClient();

createConfig({ integrator: integratorId });
initializeDayjs();

if (!isProductionEnvironment || isE2eTestingEnvironment) {
  registerLocalNetwork();
}

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <PostHogProvider client={posthog}>
      <ArbQueryParamProvider>
        <WagmiProvider config={wagmiConfig}>
          <QueryClientProvider client={queryClient}>
            <TooltipProvider>
              <AppContextProvider>{children}</AppContextProvider>
            </TooltipProvider>
          </QueryClientProvider>
        </WagmiProvider>
      </ArbQueryParamProvider>
    </PostHogProvider>
  );
}
