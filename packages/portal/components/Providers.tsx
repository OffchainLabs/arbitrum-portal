'use client';

import NextAdapterApp from 'next-query-params/app';
import posthog from 'posthog-js';
import { PostHogProvider } from 'posthog-js/react';
import { Suspense } from 'react';
import { PropsWithChildren } from 'react';
import { QueryParamProvider } from 'use-query-params';

if (typeof window !== 'undefined' && typeof process.env.NEXT_PUBLIC_POSTHOG_KEY === 'string') {
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
    api_host: 'https://app.posthog.com',
    loaded: (posthog) => {
      if (process.env.NODE_ENV !== 'production') {
        // when in dev, you can see data that would be sent in prod (in devtools)
        posthog.debug();
      }
    },
    // store data in temporary memory that expires with each session
    persistence: 'memory',
    // by default posthog autocaptures (sends) events such as onClick, etc
    // we set up our own events instead
    autocapture: false,
    disable_session_recording: true,
  });
}

export const Providers = ({ children }: PropsWithChildren) => {
  return (
    <Suspense>
      <PostHogProvider client={posthog}>
        <QueryParamProvider
          adapter={NextAdapterApp}
          options={{ updateType: 'replaceIn', removeDefaultsFromUrl: true }}
        >
          {children}
        </QueryParamProvider>
      </PostHogProvider>
    </Suspense>
  );
};
