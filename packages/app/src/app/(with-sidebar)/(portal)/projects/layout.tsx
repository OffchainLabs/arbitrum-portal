import { PageHeading } from '@/app-components/ArbitrumNavigation';
import { ProjectsCountByFilters } from '@/portal/components/ProjectsCountByFilters';
import { ProjectsFilterBar } from '@/portal/components/ProjectsFilterBar';

export default function ProjectsListPageLayout({
  children, // will be a page or nested layout
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <PageHeading>Projects</PageHeading>
      <ProjectsFilterBar />

      <ProjectsCountByFilters />

      {children}
    </>
  );
}
