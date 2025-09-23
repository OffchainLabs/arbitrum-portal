import { ProjectsFilterBar } from '@/components/ProjectsFilterBar';
import { ProjectsCountByFilters } from '@/components/ProjectsCountByFilters';

export default function ProjectsListPageLayout({
  children, // will be a page or nested layout
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <ProjectsFilterBar />

      <ProjectsCountByFilters />

      {children}
    </>
  );
}
