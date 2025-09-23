import React from 'react';
import { Metadata } from 'next';

import { Projects } from '@/components/Projects';
import { useFilteredProjects } from '@/hooks/useFilteredProjects';
import {
  ServerSideAppProps,
  getServerSideAppParams,
} from '@/common/getServerSideAppParams';
import { getMetaData } from '@/common/getMetaData';

// Generate server-side metadata for this page
export function generateMetadata(props: ServerSideAppProps): Metadata {
  return getMetaData(props);
}

export default function ProjectsPage(props: ServerSideAppProps) {
  const {
    selectedCategory,
    selectedSubcategories,
    selectedChains,
    selectedSort,
  } = getServerSideAppParams(props);

  const projects = useFilteredProjects({
    selectedCategory,
    selectedSubcategories,
    selectedChains,
  });

  // No project found in existing filters, show no-data-placeholder
  if (projects.length === 0) {
    return (
      <div className="col-span-full mt-16 text-center text-2xl text-white/50">
        Whoops, your filters didn’t match anything in our system
      </div>
    );
  }

  // Else, if the filters don't match a specific category (eg. all, or none, or custom selection) show filtered projects
  return (
    <Projects
      projects={projects}
      analyticsSource="Filtered Projects"
      selectedSort={selectedSort}
    />
  );
}
