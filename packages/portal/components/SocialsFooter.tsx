import { DISCORD_LINK } from '@/common/constants';
import { ExternalLink } from './ExternalLink';
import { DiscordIcon, GithubIcon, TwitterXIcon } from './SvgIcons';

export const SocialsFooter = () => {
  return (
    <div className="mx-auto w-full max-w-[1153px] px-6 pb-6">
      <hr className="mb-6 border-2 border-white/50" />
      <div className="flex flex-nowrap items-center justify-between gap-4 text-xl">
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
    </div>
  );
};
