'use client';

import Link from 'next/link';
import React, { useEffect, useMemo } from 'react';
import { useWindowSize } from 'react-use';
import { forceCheck } from 'react-lazyload';
import { LinkIcon } from '@heroicons/react/24/outline';
import { ProjectItemBox } from './ProjectItemBox';
import {
  EntityCardDisplayMode,
  FullProject,
  SortOptions,
} from '@/common/types';
import { useFilters } from '@/hooks/useFilters';
import { sortBySubcategoryRank } from '../common/subcategories';
import { sortProjects } from '../common/projects';

export const ProjectsList = React.memo(
  ({
    projects,
    analyticsSource,
    entityCardDisplayMode,
    selectedSort,
  }: {
    projects: FullProject[];
    analyticsSource?: string;
    entityCardDisplayMode?: EntityCardDisplayMode;
    selectedSort?: SortOptions;
  }) => {
    // only sort projects if sort-prop is passed, eg. in Search results, we would like the sort order to be preserved
    const _projects = selectedSort
      ? projects.sort((a, b) => {
          return sortProjects(a, b, selectedSort);
        })
      : projects;

    return (
      <div className="projects-list grid gap-4 sm:grid-cols-1 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
        {_projects.map((project) => (
          <ProjectItemBox
            slug={project.slug}
            key={project.slug}
            analyticsSource={analyticsSource}
            displayMode={entityCardDisplayMode}
          />
        ))}
      </div>
    );
  },
  (
    {
      projects: prevProjects,
      analyticsSource: prevAnalyticsSource,
      selectedSort: prevSelectedSort,
    },
    {
      projects: newProjects,
      analyticsSource: newAnalyticsSource,
      selectedSort: newSelectedSort,
    },
  ) => {
    if (prevAnalyticsSource !== newAnalyticsSource) {
      return false;
    }

    if (prevProjects.length !== newProjects.length) {
      return false;
    }

    if (prevSelectedSort !== newSelectedSort) {
      return false;
    }

    // Compare slugs for both arrays
    for (let i = 0; i < prevProjects.length; i++) {
      if (prevProjects[i].slug !== newProjects[i].slug) {
        return false;
      }
    }

    return true;
  },
);
ProjectsList.displayName = 'ProjectsList';

// Projects listing with grouping
export const Projects = ({
  projects = [],
  groupBySubcategory = true,
  analyticsSource,
  selectedSort,
}: {
  projects: FullProject[];
  groupBySubcategory?: boolean;
  analyticsSource?: string;
  selectedSort?: SortOptions;
}) => {
  const { width } = useWindowSize(); // bugfix: if browser resizes and layout changes, force-check lazy loaded render

  const { allowedSubcategories } = useFilters();

  useEffect(() => {
    forceCheck();
  }, [projects, width]);

  const groupedProjectsBySubcategory = useMemo(() => {
    const groupedByCategories: {
      [subcategory: string]: {
        slug: string;
        id: string;
        title: string;
        projects: FullProject[];
      };
    } = {};

    projects.forEach((project) => {
      project.subcategories.forEach((subcategory) => {
        if (
          allowedSubcategories.length === 0 ||
          allowedSubcategories.includes(subcategory.slug)
        ) {
          if (!groupedByCategories[subcategory.slug]) {
            groupedByCategories[subcategory.slug] = {
              ...subcategory,
              projects: [],
            };
          }
          groupedByCategories[subcategory.slug].projects.push(project);
        }
      });
    });

    return groupedByCategories;
  }, [projects, allowedSubcategories]);

  return (
    <div className="m-auto w-full">
      {groupBySubcategory ? (
        <div className="flex flex-col gap-12">
          {Object.keys(groupedProjectsBySubcategory)
            .sort(sortBySubcategoryRank)
            .map((subcategoryKey) => {
              const subcategory = groupedProjectsBySubcategory[subcategoryKey];
              return (
                <div key={subcategoryKey} id={`projects-${subcategoryKey}`}>
                  <Link
                    className="group flex w-max items-center gap-2 py-4 text-xl"
                    href={`#projects-${subcategoryKey}`}
                  >
                    <div>{subcategory.title}</div>
                    <span className="min-h-6 min-w-6 flex items-center justify-center rounded-full bg-white/20 p-1 px-3 text-center text-xs text-white/50 group-hover:hidden">
                      {subcategory.projects.length}
                    </span>
                    <LinkIcon className="hidden h-4 w-4 group-hover:flex" />
                  </Link>

                  <ProjectsList
                    projects={subcategory.projects}
                    analyticsSource={analyticsSource}
                    selectedSort={selectedSort}
                  />
                </div>
              );
            })}
        </div>
      ) : (
        // in case of no grouping - just list out all the projects
        <ProjectsList
          projects={projects}
          analyticsSource={analyticsSource}
          selectedSort={selectedSort}
        />
      )}
    </div>
  );
};
