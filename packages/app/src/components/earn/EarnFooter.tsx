'use client';

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

const EARN_DISCLAIMER =
  'Arbitrum Earn is a non-custodial front-end interface for interacting with third party protocols. Any transactions are facilitated by third party protocols which are not controlled by Arbitrum Earn. Base APY and any Rewards amounts are provided by the underlying protocols; no amounts are provided by Arbitrum Earn. Data is provided by third parties, and is for informational purposes only. Do your own independent research and proceed at your own risk.';

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
      <p className="mb-6">{EARN_DISCLAIMER}</p>
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
