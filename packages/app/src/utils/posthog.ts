import type { BeforeSendFn } from 'posthog-js';

import { PORTAL_DOMAIN } from '@/bridge/constants';

/**
 * Device, locale and timezone properties PostHog collects by default. They are
 * dropped client-side before any event leaves the browser.
 */
export const POSTHOG_DEVICE_PROPERTY_DENYLIST = [
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
export const POSTHOG_DEVICE_PROPERTY_PATTERN = /^\$(?:screen|viewport|device|os|browser|timezone)/;

export const POSTHOG_MASKED_QUERY_PARAMS = ['destinationAddress', 'amount', 'amount2'];

/** Bridge URLs can carry the masked params above in their query string. */
const BRIDGE_REFERRER_PREFIX = `${PORTAL_DOMAIN}/bridge`;

/**
 * Runs last, after property_denylist and after $set/$set_once are built.
 * Must never throw: posthog-js drops the event entirely if it does.
 */
export const sanitizePostHogEvent: BeforeSendFn = (event) => {
  if (!event?.properties) {
    return event;
  }

  for (const key of Object.keys(event.properties)) {
    if (POSTHOG_DEVICE_PROPERTY_PATTERN.test(key)) {
      delete event.properties[key];
    }
  }

  // if referrer is the bridge, strip the query params
  const referrer = event.properties.$referrer;
  if (typeof referrer === 'string' && referrer.startsWith(BRIDGE_REFERRER_PREFIX)) {
    const queryIndex = referrer.indexOf('?');
    if (queryIndex !== -1) {
      event.properties.$referrer = referrer.slice(0, queryIndex);
    }
  }

  return event;
};
