import { FullProject } from '@/common/types';

import { ProjectWidget } from './ProjectWidget';

export const PlatformsWidget = ({ project }: { project: FullProject }) => {
  const platforms = project.meta.supportedPlatforms;

  // only show this widget for gaming platforms
  const isGaming = project.categoryIds.includes('gaming');

  if (!isGaming) return null;
  if (!platforms?.length) return null;

  return (
    <ProjectWidget>
      <ProjectWidget.Title>Platforms</ProjectWidget.Title>

      <div className="flex items-center gap-2">
        <ProjectWidget.DataKey>Supported platforms</ProjectWidget.DataKey>
        <ProjectWidget.DataValue>
          {platforms.map((platform) => (
            <span key={platform}>{platform}</span>
          ))}
        </ProjectWidget.DataValue>
      </div>
    </ProjectWidget>
  );
};
