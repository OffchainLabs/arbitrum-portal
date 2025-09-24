import { EntityType, FullProject, OrbitChain } from './types';

export const ENTITY_METADATA: {
  [key in EntityType]: { title: string; queryParamKey?: string };
} = {
  [EntityType.Project]: {
    title: 'Project',
    queryParamKey: 'project',
  },
  [EntityType.OrbitChain]: {
    title: 'Orbit Chain',
    queryParamKey: 'orbitChain',
  },
  [EntityType.Category]: {
    title: 'Category',
  },
  [EntityType.Subcategory]: {
    title: 'Sub Category',
  },
} as const;

export const isProject = (entity: any): entity is FullProject => {
  return entity.entityType === EntityType.Project;
};

export const isOrbitChain = (entity: any): entity is OrbitChain => {
  return entity.entityType === EntityType.OrbitChain;
};
