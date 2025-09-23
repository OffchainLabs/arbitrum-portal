'use client';

import { MobileSidebar } from '@offchainlabs/cobalt';
import { usePostHog } from 'posthog-js/react';

export const MobileHeaderToggleMenu = () => {
  const posthog = usePostHog();
  return <MobileSidebar logger={posthog} />;
};
