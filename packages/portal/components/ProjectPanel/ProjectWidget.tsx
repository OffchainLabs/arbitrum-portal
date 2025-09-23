'use client';

import React, { PropsWithChildren } from 'react';
import { Card } from '../Card';
import { ExternalLink } from '../ExternalLink';
import { twMerge } from 'tailwind-merge';
import { usePostHog } from 'posthog-js/react';

const Title = ({ children }: PropsWithChildren) => {
  return <div className="text-lg">{children}</div>;
};

const DataKey = ({ children }: PropsWithChildren) => {
  return (
    <div className="whitespace-nowrap text-sm text-white/40">{children}</div>
  );
};

const DataValue = ({ children }: PropsWithChildren) => {
  return <div className="text-sm text-white/80">{children}</div>;
};

const CTA = ({
  link,
  children,
  className,
  analyticsTitle,
}: PropsWithChildren<{
  link: string;
  className?: string;
  analyticsTitle?: string;
}>) => {
  const posthog = usePostHog();

  return (
    <ExternalLink
      className={twMerge(
        'flex h-12 w-fit grow-0 flex-nowrap items-center gap-3 rounded-md bg-[#303133] p-3 text-sm hover:bg-white/20 lg:w-full',
        className,
      )}
      href={link}
      onClick={() => {
        if (analyticsTitle) {
          posthog?.capture('Project Panel Clicks', {
            Link: analyticsTitle,
          });
        }
      }}
    >
      {children}
    </ExternalLink>
  );
};

export const ProjectWidget = ({
  className,
  children,
}: PropsWithChildren<{ className?: string }>) => {
  /* 
    Separate the CTA and rest of the content from children to show them differently
  */

  const content = Array.isArray(children)
    ? children.filter((child) => child?.type?.name !== 'CTA')
    : children;

  const cta = Array.isArray(children)
    ? children.filter((child) => child?.type?.name === 'CTA')
    : null;

  return (
    <Card
      className={twMerge(
        'flex flex-col justify-between gap-3 bg-default-black p-6 lg:col-span-1 lg:min-h-[150px] lg:items-start lg:text-lg',
        className,
      )}
    >
      {content}

      {/* CTA here separately so that `flex` acts on it */}
      {cta}
    </Card>
  );
};

ProjectWidget.Title = Title;
ProjectWidget.DataKey = DataKey;
ProjectWidget.DataValue = DataValue;
ProjectWidget.CTA = CTA;
