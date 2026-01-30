'use client';

import { BookmarkIcon } from '@heroicons/react/24/outline';
import Image from 'next/image';
import Link from 'next/link';
import { twMerge } from 'tailwind-merge';

import { PageHeading } from '@/app-components/AppShell';
import { useArbQueryParams } from '@/hooks/useArbQueryParams';
import { useBookmarkedProjects } from '@/hooks/useBookmarkedProjects';
import { useDyorProjects } from '@/hooks/useDyorProjects';

import { Card } from './Card';
import { ProjectsList } from './Projects';

const CountBadge = ({ count }: { count: number }) => (
  <span className="flex h-5 items-center justify-center rounded-full bg-default-black-hover p-1 px-3 text-center text-xs text-white/50 group-hover:hidden">
    {count}
  </span>
);

export const MyProjects = () => {
  const [{ myAppsView }, setArbQueryParams] = useArbQueryParams();

  const isDyorView = myAppsView === 'dyor';

  const { bookmarkedProjects } = useBookmarkedProjects();
  const { dyorProjects } = useDyorProjects();

  const projects = isDyorView ? dyorProjects : bookmarkedProjects;

  return (
    <>
      <PageHeading>My Apps</PageHeading>
      <Card
        className="relative mb-4 flex h-[100px] flex-row items-center justify-between text-2xl lg:px-10 lg:text-3xl"
        style={{
          background: isDyorView
            ? 'linear-gradient(163deg, rgba(29,63,112,1) 0%, rgba(91,101,147,1) 26%, rgba(91,53,103,1) 40%, rgba(40,52,115,1) 60%, rgba(126,91,212,1) 84%, rgba(135,64,64,1) 100%)'
            : 'linear-gradient(163deg, rgba(21,44,78,1) 17%, rgba(18,170,255,1) 44%, rgba(193,169,136,1) 65%, rgba(229,115,16,1) 80%, rgba(246,38,116,1) 100%)',
        }}
      >
        {isDyorView ? 'D.Y.O.R.' : 'Bookmarks'}

        <Image
          alt={isDyorView ? 'D.Y.O.R.' : 'Bookmarks'}
          src={`/images/myapps_${isDyorView ? 'dyor' : 'bookmarks'}.webp`}
          height={isDyorView ? 60 : 90}
          width={isDyorView ? 80 : 170}
          className={twMerge('z-100', isDyorView ? '' : '-mr-12')}
        />
      </Card>

      <div className="-mt-4 mb-4">
        <div className="flex flex-row gap-4">
          <button
            onClick={() => setArbQueryParams({ myAppsView: 'all' })}
            className={twMerge(
              'box-border flex flex-row items-center gap-3 p-2 text-base',
              !isDyorView && 'border-b-4',
            )}
          >
            Bookmarks <CountBadge count={bookmarkedProjects.length} />
          </button>

          <button
            onClick={() => setArbQueryParams({ myAppsView: 'dyor' })}
            className={twMerge(
              'box-border flex flex-row items-center gap-3 p-2 text-base',
              isDyorView && 'border-b-4',
            )}
          >
            DYOR <CountBadge count={dyorProjects.length} />
          </button>
        </div>
        <hr className="mt-[-2px]" />
      </div>

      {!projects.length ? (
        <div className="flex flex-col gap-8 opacity-80">
          <div>
            Looks like you have not {isDyorView ? 'conducted research (DYOR) on' : 'bookmarked'} any
            apps yet.
            <div className="mt-2 flex flex-row items-center gap-2 text-sm opacity-80">
              To {isDyorView ? 'DYOR' : 'bookmark'},{' '}
              {isDyorView ? (
                'explore the DYOR Checklist section'
              ) : (
                <>
                  click the <BookmarkIcon className="h-4 w-4" /> button
                </>
              )}{' '}
              present on any app.
            </div>
          </div>
          <Link href="/projects/defi" className="underline underline-offset-8 hover:opacity-70">
            Explore Apps on Arbitrum
          </Link>
        </div>
      ) : null}

      {projects.length ? (
        <ProjectsList
          projects={projects}
          analyticsSource={`${isDyorView ? 'DYOR' : 'Bookmarked'} Projects`}
          entityCardDisplayMode={isDyorView ? 'normal' : 'bookmarked'}
        />
      ) : null}
    </>
  );
};
