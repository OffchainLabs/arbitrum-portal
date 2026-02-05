import {
  ARBITRUM_TECHNOLOGY_LINK,
  DISCORD_LINK,
  MEDIA_KIT_LINK,
  OFFCHAIN_LABS_LINK,
  PRIVACY_POLICY_LINK,
  STATUS_LINK,
  TERMS_OF_SERVICE_LINK,
} from '@/common/constants';

import { ExternalLink } from './ExternalLink';
import { DiscordIcon, GithubIcon, TwitterXIcon } from './SvgIcons';

export const SocialsFooter = () => {
  return (
    <div className="mx-auto w-full max-w-[1153px] px-6 pb-6">
      <hr className="mb-6 border-2 border-white/50" />
      <div className="mb-6 flex flex-nowrap items-center justify-between gap-4 text-xl">
        Get Connected
        <div className="flex gap-4">
          <ExternalLink
            className="flex h-[30px] w-[30px] shrink-0 flex-col items-center justify-center rounded-md bg-white text-xs text-default-black hover:bg-white/90"
            href="https://twitter.com/arbitrum"
          >
            <TwitterXIcon size={20} />
          </ExternalLink>

          <ExternalLink
            className="flex h-[30px] w-[30px] shrink-0 flex-col items-center justify-center rounded-md bg-white text-xs text-default-black hover:bg-white/90"
            href={DISCORD_LINK}
          >
            <DiscordIcon size={20} />
          </ExternalLink>

          <ExternalLink
            className="flex h-[30px] w-[30px] shrink-0 flex-col items-center justify-center rounded-md bg-white text-xs text-default-black hover:bg-white/90"
            href="https://github.com/OffchainLabs"
          >
            <GithubIcon size={20} />
          </ExternalLink>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-4 text-sm">
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
        <div className="flex items-center gap-2">
          <ExternalLink className="underline hover:no-underline" href={STATUS_LINK}>
            Status
          </ExternalLink>
          <span className="text-white/50">•</span>
          <ExternalLink className="underline hover:no-underline" href={TERMS_OF_SERVICE_LINK}>
            ToS
          </ExternalLink>
          <span className="text-white/50">•</span>
          <ExternalLink className="underline hover:no-underline" href={PRIVACY_POLICY_LINK}>
            Privacy Policy
          </ExternalLink>
          <span className="text-white/50">•</span>
          <ExternalLink className="underline hover:no-underline" href={MEDIA_KIT_LINK}>
            Media Kit
          </ExternalLink>
        </div>
      </div>
    </div>
  );
};
