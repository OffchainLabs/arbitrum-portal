'use client';

import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

import {
  ARBITRUM_TECHNOLOGY_LINK,
  DISCORD_LINK,
  MEDIA_KIT_LINK,
  OFFCHAIN_LABS_LINK,
  PRIVACY_POLICY_LINK,
  STATUS_LINK,
  TERMS_OF_SERVICE_LINK,
} from '@/common/constants';
import { ExternalLink } from '@/components/ExternalLink';

const EarnDisclaimer = () => (
  <div className="flex flex-col lg:flex-row items-start gap-5 rounded-2xl lg:bg-neutral-25 bg-transparent lg:p-8 py-8">
    <div className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-2xl bg-neutral-50">
      <ExclamationTriangleIcon className="h-6 w-6 text-white/50" />
    </div>
    <div className="flex flex-col gap-4 pt-3">
      <p className="flex flex-wrap items-baseline gap-x-4">
        <span className="font-medium text-white">Non-custodial interface.</span>
        <span>
          Third-party protocols only. Do your own independent research and proceed at your own risk.
        </span>
      </p>
      <p>
        Arbitrum Earn is a non-custodial interface for interacting with 3rd party protocols. Any
        transactions are facilitated by 3rd party protocols that are not controlled by Arbitrum
        Earn. Base APY, Rewards or any other amounts are provided by such protocols, not Arbitrum
        Earn. Data is provided by 3rd parties for informational purposes only. Do your own research
        and proceed at your own risk.
      </p>
    </div>
  </div>
);

const footerLinks = [
  { label: 'Discord', href: DISCORD_LINK },
  { label: 'GitHub', href: 'https://github.com/OffchainLabs' },
  { label: 'X', href: 'https://x.com/arbitrum' },
  { label: 'Status', href: STATUS_LINK },
  { label: 'ToS', href: TERMS_OF_SERVICE_LINK },
  { label: 'Privacy Policy', href: PRIVACY_POLICY_LINK },
  { label: 'Media Kit', href: MEDIA_KIT_LINK },
];

export function EarnFooter() {
  return (
    <footer className="mx-auto w-full pb-6 text-sm text-white/50 mt-24">
      <div className="mb-6">
        <EarnDisclaimer />
      </div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          Built with love by{' '}
          <ExternalLink className="underline hover:no-underline" href={OFFCHAIN_LABS_LINK}>
            Offchain Labs
          </ExternalLink>
          , builders of{' '}
          <ExternalLink className="underline hover:no-underline" href={ARBITRUM_TECHNOLOGY_LINK}>
            Arbitrum technology
          </ExternalLink>
          .
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {footerLinks.map((link, index) => (
            <span key={link.label} className="flex items-center gap-2">
              {index > 0 && <span>•</span>}
              <ExternalLink className="underline hover:no-underline" href={link.href}>
                {link.label}
              </ExternalLink>
            </span>
          ))}
        </div>
      </div>
    </footer>
  );
}
