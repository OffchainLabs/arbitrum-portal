import { twMerge } from 'tailwind-merge';
import { Category, EntityType } from '@/common/types';
import { CommunitySpotlight } from './CommunitySpotlight';
import { getSpotlightProjects } from '@/common/projects';

const DefiCategoryData = () => (
  <iframe
    width="100%"
    height="100%"
    src="https://defillama.com/chart/chain/Arbitrum?theme=dark"
    title="DefiLlama"
    frameBorder="0"
  />
);

export const CategoryPageBanner = ({ category }: { category: Category }) => {
  const commonWrapperClassName =
    'flex h-[350px] w-full items-center justify-center overflow-hidden rounded-lg bg-default-black text-center text-sm text-white/50';

  if (category.slug === 'defi') {
    return (
      <div
        className={twMerge(
          commonWrapperClassName,
          'h-[380px] px-0 py-4 lg:p-4',
        )}
      >
        <DefiCategoryData />
      </div>
    );
  }

  const spotlightProjects = getSpotlightProjects(category.slug);

  // show featured projects carousel / tiles
  return (
    <CommunitySpotlight
      title={
        spotlightProjects.length === 1
          ? 'Featured Project'
          : 'Featured Projects'
      }
      entitySlugs={spotlightProjects}
      entityType={EntityType.Project}
    />
  );
};
