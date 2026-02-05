import { PageHeading } from '@/app-components/AppShell/components/PageHeading';
import { ProjectsCategorySelector } from '@/portal/components/ProjectsCategorySelector';
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

      <ProjectsCategorySelector />

      <ProjectsFilterBar />

      <hr className="opacity-10 hidden lg:block" />

      <ProjectsCountByFilters />

      {children}
    </>
  );
}
