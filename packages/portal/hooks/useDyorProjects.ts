'use client';

import { useCallback, useMemo } from 'react';
import { useLocalStorage } from '@uidotdev/usehooks';
import { usePostHog } from 'posthog-js/react';
import { getProjectDetailsById } from '@/common/projects';

export const DYOR_PROJECTS_KEY = 'arbitrum:portal:dyor:projects';

type AnalyticsProps = {
  project: string;
  Element?: string;
};

export type GlobalDYORState = { [key: string]: string[] }; // key=projectId, value=checked items' keys

export const useDyorProjects = () => {
  const posthog = usePostHog();

  const [globalDyorState = {}, setGlobalDyorState] =
    useLocalStorage<GlobalDYORState>(DYOR_PROJECTS_KEY, {});

  const selectDyorItem = useCallback(
    (projectId: string, checkId: string, analyticsProps?: AnalyticsProps) => {
      const projectState = globalDyorState[projectId] || [];
      setGlobalDyorState({
        ...globalDyorState,
        [projectId]: [...projectState, checkId],
      });

      if (analyticsProps) {
        posthog?.capture('Project DYOR option selected', analyticsProps);
      }
    },
    [globalDyorState],
  );

  const unselectDyorItem = useCallback(
    (projectId: string, checkId: string, analyticsProps?: AnalyticsProps) => {
      const projectState = globalDyorState[projectId] || [];
      setGlobalDyorState({
        ...globalDyorState,
        [projectId]: projectState.filter((id) => id !== checkId),
      });

      if (analyticsProps) {
        posthog?.capture('Project DYOR option unselected', analyticsProps);
      }
    },
    [globalDyorState],
  );

  const isProjectDyorInProgress = (projectId: string) => {
    return (
      Object.keys(globalDyorState).includes(projectId) &&
      globalDyorState[projectId].length > 0
    );
  };

  const dyorProjects = useMemo(() => {
    return Object.keys(globalDyorState)
      .map((projectId) => getProjectDetailsById(projectId)!)
      .filter((project) => !!project);
  }, [globalDyorState]);

  return {
    globalDyorState,
    dyorProjects,
    selectDyorItem,
    unselectDyorItem,
    isProjectDyorInProgress,
  };
};
