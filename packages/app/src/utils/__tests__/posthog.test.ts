import type { CaptureResult } from 'posthog-js';
import { describe, expect, it } from 'vitest';

import {
  POSTHOG_DEVICE_PROPERTY_DENYLIST,
  POSTHOG_DEVICE_PROPERTY_PATTERN,
  sanitizePostHogEvent,
} from '../posthog';

function makeEvent(properties: Record<string, unknown>): CaptureResult {
  return {
    uuid: 'test-uuid',
    event: '$pageview',
    properties: properties as CaptureResult['properties'],
  };
}

describe('sanitizePostHogEvent', () => {
  it('removes every denylisted device, browser and timezone property', () => {
    const properties = Object.fromEntries(
      POSTHOG_DEVICE_PROPERTY_DENYLIST.map((key) => [key, 'value']),
    );

    const result = sanitizePostHogEvent(makeEvent({ ...properties, $current_url: 'x' }));

    expect(result?.properties).toEqual({ $current_url: 'x' });
  });

  it('removes properties in a denied family that are not listed explicitly', () => {
    const result = sanitizePostHogEvent(
      makeEvent({
        $device_id: null,
        $browser_type: 'browser',
        $screen_dpi: 2,
        $lib: 'web',
      }),
    );

    expect(result?.properties).toEqual({ $lib: 'web' });
  });

  it('keeps properties cookieless mode and page analytics rely on', () => {
    const properties = {
      $current_url: 'https://portal.arbitrum.io/bridge?destinationAddress=<masked>',
      $pathname: '/bridge',
      $host: 'portal.arbitrum.io',
      $raw_user_agent: 'Mozilla/5.0',
      $cookieless_mode: true,
      $geoip_disable: true,
      $lib: 'web',
      $lib_version: '1.424.1',
      distinct_id: '$posthog_cookieless',
      custom_property: 'kept',
    };

    const result = sanitizePostHogEvent(makeEvent({ ...properties }));

    expect(result?.properties).toEqual(properties);
  });

  it('strips the query string from a portal bridge $referrer and keeps the path', () => {
    const result = sanitizePostHogEvent(
      makeEvent({
        $referrer: 'https://portal.arbitrum.io/bridge?destinationAddress=0xabc&amount=1',
        $referring_domain: 'portal.arbitrum.io',
      }),
    );

    expect(result?.properties).toEqual({
      $referrer: 'https://portal.arbitrum.io/bridge',
      $referring_domain: 'portal.arbitrum.io',
    });
  });

  it('leaves $referrer alone when it is not a portal bridge URL with a query string', () => {
    expect(sanitizePostHogEvent(makeEvent({ $referrer: '$direct' }))?.properties).toEqual({
      $referrer: '$direct',
    });
    expect(
      sanitizePostHogEvent(makeEvent({ $referrer: 'https://portal.arbitrum.io/bridge' }))
        ?.properties,
    ).toEqual({ $referrer: 'https://portal.arbitrum.io/bridge' });
    expect(
      sanitizePostHogEvent(makeEvent({ $referrer: 'https://example.com/bridge?amount=1' }))
        ?.properties,
    ).toEqual({ $referrer: 'https://example.com/bridge?amount=1' });
    expect(
      sanitizePostHogEvent(makeEvent({ $referrer: 'https://portal.arbitrum.io/earn?tab=1' }))
        ?.properties,
    ).toEqual({ $referrer: 'https://portal.arbitrum.io/earn?tab=1' });
    expect(sanitizePostHogEvent(makeEvent({ $referrer: 42 }))?.properties).toEqual({
      $referrer: 42,
    });
  });

  it('returns the input unchanged when there is nothing to sanitize', () => {
    expect(sanitizePostHogEvent(null)).toBeNull();

    const withoutProperties = { uuid: 'u', event: 'e' } as CaptureResult;
    expect(sanitizePostHogEvent(withoutProperties)).toBe(withoutProperties);
  });
});

describe('POSTHOG_DEVICE_PROPERTY_PATTERN', () => {
  it('covers every entry in the explicit denylist', () => {
    for (const key of POSTHOG_DEVICE_PROPERTY_DENYLIST) {
      expect(POSTHOG_DEVICE_PROPERTY_PATTERN.test(key), key).toBe(true);
    }
  });

  it('does not match unrelated PostHog properties', () => {
    for (const key of ['$current_url', '$pathname', '$referrer', '$raw_user_agent', '$lib']) {
      expect(POSTHOG_DEVICE_PROPERTY_PATTERN.test(key), key).toBe(false);
    }
  });
});
