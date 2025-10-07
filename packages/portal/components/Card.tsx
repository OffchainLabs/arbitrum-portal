'use client';

import { ArrowRightIcon } from '@heroicons/react/24/outline';
import Image from 'next/image';
import Link, { LinkProps as NextLinkProps } from 'next/link';
import { usePostHog } from 'posthog-js/react';
import React, { PropsWithChildren } from 'react';
import { twMerge } from 'tailwind-merge';

import EclipseBottom from '@/public/images/eclipse_bottom.png';

import { ExternalLink } from './ExternalLink';

// Our card component can act as a Next-Link / External Link / Button or a simple div
export type CardType = 'link' | 'externalLink' | 'button' | 'div';

export type AnalyticsProps = {
  eventName: string;
  eventProperties?: { [property: string]: string };
};

type LinkProps = { cardType: 'link' } & NextLinkProps;
type ExternalLinkProps = {
  cardType: 'externalLink';
} & React.AnchorHTMLAttributes<HTMLAnchorElement>;
type ButtonProps = {
  cardType: 'button';
} & React.ButtonHTMLAttributes<HTMLButtonElement>;
type DivProps = React.HTMLProps<HTMLDivElement>;

type CardProps = LinkProps | ButtonProps | ExternalLinkProps | DivProps;
type CardAnalyticsProps = {
  className?: string;
  cardType?: CardType;
  analyticsProps?: AnalyticsProps;
  showExternalLinkArrow?: boolean;
  grainy?: boolean;
};
type CardPropsWithAnalytics = CardProps & CardAnalyticsProps;

const ExternalLinkArrow = () => (
  <ArrowRightIcon className="absolute bottom-4 right-4 hidden h-4 w-4 group-hover:flex" />
);

const GrainyBackground = () => (
  <Image
    src={EclipseBottom}
    alt="grains"
    className="absolute left-1/2 top-0 z-0 w-full -translate-x-1/2 rotate-180 opacity-20"
    aria-hidden
  />
);

export const Card = ({
  children,
  cardType = 'div',
  showExternalLinkArrow,
  grainy = false,
  ...props
}: PropsWithChildren<CardPropsWithAnalytics>) => {
  const posthog = usePostHog();

  const commonClassName = twMerge(
    'group w-full overflow-hidden rounded-md bg-default-black p-4 text-sm relative transition-colors duration-300',
    props.className,
    grainy ? 'relative' : '',
  );

  const captureEventOnClick = (e: any) => {
    try {
      if (props.analyticsProps) {
        posthog?.capture(props.analyticsProps.eventName, props.analyticsProps.eventProperties);
      }
    } catch (e) {}

    // execute the actual click event
    if (typeof props.onClick === 'function') {
      props.onClick(e);
    }
  };

  // Card that can also act as a next-optimized internal link
  if (cardType === 'link') {
    const { analyticsProps, cardType, ...cardProps } = props as LinkProps & CardAnalyticsProps;
    return (
      <Link
        {...cardProps}
        className={twMerge(
          'cursor-pointer hover:bg-default-black-hover',
          grainy && '[&>*]:z-10',
          commonClassName,
        )}
        onClick={captureEventOnClick}
      >
        {grainy ? <GrainyBackground /> : null}
        {children}

        {showExternalLinkArrow && <ExternalLinkArrow />}
      </Link>
    );
  }

  // Card that can also act as an external link
  if (cardType === 'externalLink') {
    const { analyticsProps, ...cardProps } = props as ExternalLinkProps & CardAnalyticsProps;
    return (
      <ExternalLink
        {...cardProps}
        className={twMerge('hover:bg-default-black-hover', grainy && '[&>*]:z-10', commonClassName)}
        onClick={captureEventOnClick}
      >
        {grainy ? <GrainyBackground /> : null}
        {children}

        {showExternalLinkArrow && <ExternalLinkArrow />}
      </ExternalLink>
    );
  }

  // Card that can also act as a button
  if (cardType === 'button') {
    const cardProps = props as ButtonProps;
    return (
      <button
        {...cardProps}
        className={twMerge('hover:bg-default-black-hover', grainy && '[&>*]:z-10', commonClassName)}
        onClick={captureEventOnClick}
      >
        {grainy ? <GrainyBackground /> : null}
        {children}
        {showExternalLinkArrow && <ExternalLinkArrow />}
      </button>
    );
  }

  // Normal Card without any additional functionality
  const cardProps = props as DivProps;
  return (
    <div
      {...cardProps}
      className={twMerge(
        'w-full overflow-hidden rounded-lg bg-default-black/80 p-4 text-sm',
        grainy && '[&>*]:z-10',
        cardProps.className,
      )}
      onClick={captureEventOnClick}
    >
      {grainy ? <GrainyBackground /> : null}
      {children}
      {showExternalLinkArrow && <ExternalLinkArrow />}
    </div>
  );
};
