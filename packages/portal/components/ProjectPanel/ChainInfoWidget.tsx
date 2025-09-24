import Image from 'next/image';
import { Tooltip } from '../Tooltip';
import { EntityType, FullProject } from '@/common/types';
import { getChainDetailsById, getChainSlugFromTitle } from '@/common/chains';
import { useEntitySidePanel } from '@/hooks/useEntitySidePanel';
import { twMerge } from 'tailwind-merge';

export const ChainInfoWidget = ({ project }: { project: FullProject }) => {
  const { openEntitySidePanel: openOrbitChainPanel } = useEntitySidePanel(
    EntityType.OrbitChain,
  );

  if (!project.chains.length) return null;

  return (
    <div className="col-span-4 flex flex-row flex-nowrap items-center gap-4 rounded-lg bg-default-black p-6">
      <span className="shrink-0 whitespace-nowrap pr-4">Runs on</span>

      <div className="flex flex-row flex-wrap gap-6 lg:gap-4">
        {project.chains.map((chainTitle) => {
          const chainSlug = getChainSlugFromTitle(chainTitle);
          const chainDetails = getChainDetailsById(chainSlug);

          if (!chainDetails) return null;

          const clickable = chainDetails.isOrbitChain;

          return (
            <Tooltip
              key={chainDetails.slug}
              content={<p>{chainDetails.description}</p>}
            >
              <div
                className={twMerge(
                  'flex shrink-0 items-center gap-2 whitespace-nowrap rounded-md p-1 px-2',
                  clickable ? 'cursor-pointer hover:bg-white/10' : '',
                )}
                onClick={() => {
                  clickable ? openOrbitChainPanel(chainSlug) : null;
                }}
              >
                <Image
                  src={chainDetails.logoUrl}
                  alt={`${chainDetails.title} Logo`}
                  width={22}
                  height={22}
                />
                {chainDetails.title}
              </div>
            </Tooltip>
          );
        })}
      </div>
    </div>
  );
};
