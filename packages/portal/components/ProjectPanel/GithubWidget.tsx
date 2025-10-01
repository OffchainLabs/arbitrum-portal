import { FullProject } from '@/common/types';
import { GithubIcon } from '@/components/SvgIcons';

import { ProjectWidget } from './ProjectWidget';

export const GithubWidget = ({ project }: { project: FullProject }) => {
  if (!project.links.github) return null;

  return (
    <ProjectWidget>
      <ProjectWidget.Title>Code Updates</ProjectWidget.Title>

      <ProjectWidget.CTA link={project.links.github} className="fill-white" analyticsTitle="Github">
        <GithubIcon size={20} />
        Check Github
      </ProjectWidget.CTA>
    </ProjectWidget>
  );
};
