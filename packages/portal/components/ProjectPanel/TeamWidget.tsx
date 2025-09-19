import Image from 'next/image';
import { formatDate } from '../../common/dateUtils';
import { FullProject } from '../../common/types';
import { ProjectWidget } from './ProjectWidget';

export const TeamWidget = ({ project }: { project: FullProject }) => {
  const teamInformationAvailable =
    project.links.fundingNews || project.meta.foundedDate;

  if (!teamInformationAvailable) return null;

  return (
    <ProjectWidget>
      <div className="flex flex-col gap-2">
        <ProjectWidget.Title>Team</ProjectWidget.Title>

        {project.meta.foundedDate && (
          <div className="flex items-center gap-2">
            <ProjectWidget.DataKey>Founded On</ProjectWidget.DataKey>
            <ProjectWidget.DataValue>
              {formatDate(project.meta.foundedDate, 'MMM DD, YYYY')}
            </ProjectWidget.DataValue>
          </div>
        )}
      </div>

      {project.links.fundingNews && (
        <ProjectWidget.CTA
          link={project.links.fundingNews}
          analyticsTitle="Crunchbase"
        >
          <Image
            src={'/images/crunchbase.webp'}
            width={18}
            height={18}
            alt="Crunchbase Logo"
          />
          Crunchbase
        </ProjectWidget.CTA>
      )}
    </ProjectWidget>
  );
};
