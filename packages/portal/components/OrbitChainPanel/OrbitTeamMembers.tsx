import Image from 'next/image';
import { twMerge } from 'tailwind-merge';

import { OrbitChain, OrbitChainTeamMember } from '@/common/types';
import { Card } from '@/components/Card';

import { LinkedinIcon, TwitterXIcon } from '../SvgIcons';

const generateTeamMemberAvatar = (member: OrbitChainTeamMember) => {
  if (member.avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        className="h-[15px] w-[15px] shrink-0 rounded-full"
        src={member.avatarUrl}
        alt={member.primaryText}
      />
    );
  }

  if (member.link.includes('twitter'))
    return (
      <div className="flex h-[15px] w-[15px] flex-col items-center justify-center fill-white">
        <TwitterXIcon size={15} />
      </div>
    );

  if (member.link.includes('crunchbase'))
    return (
      <div className="relative flex h-[15px] w-[15px] flex-col items-center justify-center rounded-full bg-black/20">
        <Image
          src={'/images/crunchbase.webp'}
          width={15}
          height={15}
          alt="Crunchbase Logo"
          className="shrink-0"
        />
      </div>
    );

  if (member.link.includes('linkedin'))
    return (
      <div className="relative flex h-[15px] w-[15px] flex-col items-center justify-center rounded-full bg-black/20">
        <LinkedinIcon size={15} />
      </div>
    );

  return null;
};

export const OrbitTeamMembers = ({
  orbitChain,
  className,
}: {
  orbitChain: OrbitChain;
  className?: string;
}) => {
  if (!orbitChain.teamMembers.length) return null;

  return (
    <Card className={twMerge('flex flex-col gap-4', className)}>
      <div className="mr-4 text-base">Team</div>
      <div className="flex w-full flex-col justify-evenly gap-3">
        {orbitChain.teamMembers.map((member: OrbitChainTeamMember, index) => {
          const avatar = generateTeamMemberAvatar(member);

          return (
            <Card
              key={`member_${index}`}
              className="flex h-[40px] flex-nowrap items-center gap-3 overflow-hidden text-ellipsis whitespace-nowrap bg-white/10 fill-white p-3 hover:bg-white/20"
              cardType="externalLink"
              href={member.link ?? '#'}
            >
              {avatar}
              <div className="flex flex-col items-center">
                <div className="text-center text-base">{member.primaryText}</div>
                <div className="text-sm opacity-50">{member.secondaryText}</div>
              </div>
            </Card>
          );
        })}
      </div>
    </Card>
  );
};
