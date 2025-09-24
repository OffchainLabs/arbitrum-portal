import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { Projects } from '@/portal/components/Projects'
import { CategoryPageBanner } from '@/portal/components/CategoryPageBanner'
import { CategoryPageDescription } from '@/portal/components/CategoryPageDescription'
import { getCategoryDetailsById } from '@/portal/common/categories'
import { useFilteredProjects } from '@/portal/hooks/useFilteredProjects'
import { getMetaData } from '@/portal/common/getMetaData'
import {
  ServerSideAppProps,
  getServerSideAppParams
} from '@/portal/common/getServerSideAppParams'

// Generate server-side metadata for this page
export function generateMetadata(props: ServerSideAppProps): Metadata {
  return getMetaData(props)
}

export default function Page(props: ServerSideAppProps) {
  const {
    selectedCategory,
    selectedSubcategories,
    selectedChains,
    selectedSort
  } = getServerSideAppParams(props)

  const categoryMetaData = getCategoryDetailsById(selectedCategory)

  const projects = useFilteredProjects({
    selectedCategory,
    selectedSubcategories,
    selectedChains
  })

  if (!categoryMetaData) {
    // no category data found (eg. invalid category slug in url), redirect back to homepage
    redirect('/projects')
  }

  return (
    <>
      {/* Special banner and descriptions for category homepage */}
      <CategoryPageBanner category={categoryMetaData} />
      <CategoryPageDescription category={categoryMetaData} />

      {/* Filtered projects for the category */}
      <Projects
        projects={projects}
        analyticsSource="Project Categories Page"
        selectedSort={selectedSort}
      />
    </>
  )
}
