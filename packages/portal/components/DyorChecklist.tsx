import { CheckIcon, ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';
import Image from 'next/image';
import Link from 'next/link';
import React, { useMemo, useState } from 'react';
import { twMerge } from 'tailwind-merge';

import { FullProject } from '@/common/types';
import { useDyorProjects } from '@/hooks/useDyorProjects';

import { Card } from './Card';
import { ExternalLink } from './ExternalLink';

type Check = { id: string; title: React.ReactNode; checked: boolean };
type Content = {
  id: string;
  title: string;
  description: string;
  denyCategories: string[];
  checks: Check[];
}[];

const content: Content = [
  {
    id: 'team',
    title: 'Scope the team',
    description: 'Check their Twitter, Discord, Website, and other socials',
    denyCategories: [],
    checks: [
      {
        id: 'teamResponsive',
        title: 'Is the team present and responsive?',
        checked: false,
      },
      {
        id: 'realCommunity',
        title: 'Do community members seem real and engage with sustained excitement?',
        checked: false,
      },
      {
        id: 'easyToUnderstand',
        title: 'Does their website explain what they do in a way you understand?',
        checked: false,
      },
      {
        id: 'foundersPublic',
        title: 'Are the founders doxx’d (publicly identified)?',
        checked: false,
      },
    ],
  },
  {
    id: 'app',
    title: 'Scope the app',
    description: '',
    denyCategories: [],
    checks: [
      {
        id: 'securityAudit',
        title: 'Is there a security audit?',
        checked: false,
      },
      {
        id: 'smartContractCheck',
        title: (
          <div>
            Check their smart contract on <ExternalLink>bcheck.edu</ExternalLink>. Are there any red
            flags?
          </div>
        ),
        checked: false,
      },
      {
        id: 'tokenContractCheck',
        title: (
          <div>
            Check their smart contract on <ExternalLink>tokensniffer.com</ExternalLink>. Are there
            any red flags?
          </div>
        ),
        checked: false,
      },
      {
        id: 'whitepaperPresent',
        title: 'Is their whitepaper clear with their project roadmap?',
        checked: false,
      },
    ],
  },
  {
    id: 'ecosystem',
    title: 'Scope the ecosystem',
    description: '',
    denyCategories: [],
    checks: [
      {
        id: 'trustedCollaborations',
        title: 'Are there any collaborations with other trusted projects?',
        checked: false,
      },
    ],
  },
  {
    id: 'tokenomics',
    title: 'Scope the tokenomics',
    description: 'If the project has a token, make sure to check the following information.',
    denyCategories: ['bridges-and-on-ramps', 'infra-and-tools'],
    checks: [
      {
        id: 'tokenUtilityMarketCap',
        title: 'What is the token utility, market cap, volume, and liquidity?',
        checked: false,
      },
      {
        id: 'buySellEnabled',
        title: 'Can you buy and sell the token? (Check Poocoin / Bogged / Dextools)',
        checked: false,
      },
      {
        id: 'listedOnCoingecko',
        title: 'Is the token listed on CoinGecko and CoinMarketCap?',
        checked: false,
      },
      {
        id: 'listedOnExchanges',
        title: 'Is the token listed on exchanges?',
        checked: false,
      },
      {
        id: 'tokenAllocation',
        title: 'Is there fair and healthy distribution of tokens allocation?',
        checked: false,
      },
    ],
  },
];

export const DyorChecklist = ({
  project,
  className,
}: {
  project: FullProject;
  className?: string;
}) => {
  const projectKey = project.slug;
  const projectCategory = project.categoryIds[0];

  const [expandedSections, setExpandedSections] = useState<{
    [key: string]: boolean;
  }>({});

  const { globalDyorState, selectDyorItem, unselectDyorItem } = useDyorProjects();

  const projectState = useMemo(
    () => globalDyorState[projectKey] || [],
    [globalDyorState, projectKey],
  );

  const onChange = (check: Check) => {
    const checkId = check.id;
    const projectState = globalDyorState[projectKey] || [];

    if (projectState.includes(checkId)) {
      // unselect
      unselectDyorItem(projectKey, checkId, {
        project: projectKey,
        Element: checkId,
      });
    } else {
      // select
      selectDyorItem(projectKey, checkId, {
        project: projectKey,
        Element: checkId,
      });
    }
  };

  return (
    <Card
      className={twMerge('relative flex flex-col gap-4 p-6', className)}
      style={{
        background:
          'linear-gradient(163deg, rgba(29,63,112,1) 0%, rgba(91,101,147,1) 26%, rgba(91,53,103,1) 40%, rgba(40,52,115,1) 60%, rgba(126,91,212,1) 84%, rgba(135,64,64,1) 100%)',
      }}
    >
      <div className="absolute left-0 top-0 z-10 h-full w-full bg-black/60 backdrop-blur-lg" />

      <div className="z-20 mb-2 flex flex-col gap-2">
        <div className="flex items-start gap-2 text-xl">
          D.Y.O.R. Checklist{' '}
          <Image alt="D.Y.O.R. Checklist" src="/images/myapps_dyor.webp" height={25} width={25} />
        </div>
        <div className="text-sm text-white/75">
          If you’d like to dig deeper into this project, here is a recommended list of a
          non-exhaustive steps you can take to Do Your Own Research. We don&apos;t affiliate with
          any of the sources.
        </div>
      </div>

      <div className="z-20 flex h-full w-full flex-col gap-4">
        {content
          .filter((section) => projectCategory && !section.denyCategories.includes(projectCategory))
          .map((section) => {
            const isExpanded = expandedSections[section.id] || false;
            return (
              <div
                key={section.id}
                className="flex flex-col rounded-lg border-white/10 bg-black/80 p-4"
              >
                <div
                  className="flex cursor-pointer flex-col gap-1"
                  onClick={() =>
                    setExpandedSections({
                      ...expandedSections,
                      [section.id]: !isExpanded,
                    })
                  }
                >
                  <div className="flex flex-row items-center justify-between">
                    <div className="text-lg">{section.title}</div>

                    <div className="rounded-full p-2">
                      {isExpanded ? (
                        <ChevronUpIcon className="h-4 w-4" />
                      ) : (
                        <ChevronDownIcon className="h-4 w-4" />
                      )}
                    </div>
                  </div>

                  {isExpanded && <div className="text-sm text-white/75">{section.description}</div>}
                </div>

                <div
                  className={twMerge(
                    'flex flex-col gap-4 p-4 px-2 lg:px-8',
                    isExpanded ? '' : 'hidden',
                  )}
                >
                  {section.checks.map((check) => (
                    <div
                      key={check.id}
                      className="flex cursor-pointer items-start"
                      onClick={() => {
                        onChange(check);
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={projectState.includes(check.id)}
                        hidden
                        aria-hidden={false}
                        className="peer [&:checked~label_.checkIcon]:visible [&:checked~label_span:first-child]:border-white [&:checked~label_span:first-child]:bg-white"
                      />

                      <label
                        htmlFor={check.id}
                        className="group flex cursor-pointer items-start gap-4 rounded-md p-1 px-3 text-left font-light text-white peer-checked:text-white lg:gap-4"
                      >
                        <span className="mt-[2px] flex items-center justify-center rounded-sm border border-white bg-black p-[3px] lg:p-[1px]">
                          <CheckIcon className="checkIcon invisible h-4 w-4 stroke-black stroke-[3px] lg:h-3 lg:w-3" />
                        </span>
                        <span className="text-sm">{check.title}</span>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
      </div>

      <Link
        href="/bookmarks?myAppsView=dyor"
        className="self-end justify-self-end underline underline-offset-4	"
      >
        See all DYOR projects
      </Link>
    </Card>
  );
};
