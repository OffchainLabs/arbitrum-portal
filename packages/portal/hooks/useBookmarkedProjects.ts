'use client';

import { useLocalStorage } from '@rehooks/local-storage';
import { usePostHog } from 'posthog-js/react';
import { getProjectDetailsById } from '@/common/projects';

const BOOKMARKED_PROJECTS_KEY = 'arbitrum:portal:bookmarked:projects';

type AnalyticsProps = {
  project: string;
  Element?: string;
};

export const useBookmarkedProjects = () => {
  const posthog = usePostHog();

  const [_bookmarkedProjectIds, setBookmarkedProjectIds] = useLocalStorage<
    string[]
  >(BOOKMARKED_PROJECTS_KEY, []);

  const bookmarkedProjectIds = _bookmarkedProjectIds || [];

  const bookmarkedProjects = bookmarkedProjectIds
    .map((projectId) => getProjectDetailsById(projectId)!)
    .filter((project) => !!project);

  const addBookmarkedProject = (
    projectId: string,
    analyticsProps?: AnalyticsProps,
  ) => {
    if (bookmarkedProjectIds.includes(projectId)) return;
    setBookmarkedProjectIds([...bookmarkedProjectIds, projectId]);

    if (analyticsProps) {
      posthog?.capture('Project Bookmarked', analyticsProps);
    }
  };

  const removeBookmarkedProject = (
    projectId: string,
    analyticsProps?: AnalyticsProps,
  ) => {
    const newBookmarkedProjectIds = [...bookmarkedProjectIds];
    const index = newBookmarkedProjectIds.findIndex((val) => val === projectId);
    if (index < 0) return;
    newBookmarkedProjectIds.splice(index, 1);
    setBookmarkedProjectIds(newBookmarkedProjectIds);

    if (analyticsProps) {
      posthog?.capture('Project Bookmark Removed', analyticsProps);
    }
  };

  const isBookmarkedProject = (projectId: string) => {
    return bookmarkedProjectIds.includes(projectId);
  };

  return {
    bookmarkedProjectIds,
    bookmarkedProjects,
    addBookmarkedProject,
    removeBookmarkedProject,
    isBookmarkedProject,
  };
};
