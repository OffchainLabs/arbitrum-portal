import dynamic from 'next/dynamic';
import { PropsWithChildren } from 'react';
import { getProjectDetailsById } from '@/common/projects';
import { ProjectItemBox } from './ProjectItemBox';
import { EntityType } from '@/common/types';
import { getOrbitChainDetailsById } from '@/common/orbitChains';
import { OrbitItemBox } from './OrbitItemBox';
import { LoadingPlaceholderCarousel } from './Carousel/LoadingPlaceholderCarousel';

const Carousel = dynamic(() => import('@/components/Carousel/Carousel'), {
  ssr: false,
  loading: LoadingPlaceholderCarousel,
});

const TitleWrapper = ({
  title,
  children,
}: PropsWithChildren<{
  title?: string;
}>) => (
  <div className="align-carousel-controls-with-title flex flex-col gap-4">
    <h2 className="text-2xl">{title}</h2>
    <hr className="border-white/40" />
    {children}
  </div>
);

export const CommunitySpotlight = ({
  title,
  entitySlugs,
  entityType,
}: {
  title?: string;
  entitySlugs: string[];
  entityType: EntityType;
}) => {
  const getDetailsById =
    entityType === EntityType.OrbitChain
      ? getOrbitChainDetailsById
      : getProjectDetailsById;

  const ItemBox =
    entityType === EntityType.OrbitChain ? OrbitItemBox : ProjectItemBox;

  // if no project to spotlight
  if (entitySlugs.length === 0) return null;

  if (entitySlugs.length === 1) {
    // if only 1 entity is present - show that spanning full page width
    const entityDetails = getDetailsById(entitySlugs[0]);
    if (!entityDetails) return null;
    return (
      <TitleWrapper title={title}>
        <ItemBox
          slug={entityDetails.slug}
          lazyload={false}
          className="lg:h-[300px]"
          displayMode="spotlight"
          analyticsSource="Spotlight"
        />
      </TitleWrapper>
    );
  }

  // else if >1 projects are present - show that in a carousel spanning partial page width each
  return (
    <TitleWrapper title={title}>
      <Carousel>
        {entitySlugs.map((entitySlug) => {
          const entityDetails = getDetailsById(entitySlug);

          if (!entityDetails) return null;

          return (
            <ItemBox
              key={entitySlug}
              slug={entityDetails.slug}
              lazyload={false}
              displayMode="spotlight"
              className="m-2 lg:h-[300px]"
              analyticsSource="Spotlight"
            />
          );
        })}
      </Carousel>
    </TitleWrapper>
  );
};
