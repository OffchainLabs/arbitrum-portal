import { ProjectsFilterBar } from '@/portal/components/ProjectsFilterBar'
import { ProjectsCountByFilters } from '@/portal/components/ProjectsCountByFilters'

export default function ProjectsListPageLayout({
  children // will be a page or nested layout
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <ProjectsFilterBar />

      <ProjectsCountByFilters />

      {children}
    </>
  )
}
