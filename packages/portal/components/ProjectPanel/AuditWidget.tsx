import Image from 'next/image';
import { twMerge } from 'tailwind-merge';

import { formatOptionalDate } from '@/common/dateUtils';
import { FullProject } from '@/common/types';
import IconLink from '@/public/images/link.svg';

import { ProjectWidget } from './ProjectWidget';

export const AuditWidget = ({ project }: { project: FullProject }) => {
  const auditInformationAvailable = project.meta.auditReportDate || project.links.audit;

  // show this widget for defi category only
  const isDefi = project.categoryIds.includes('defi');
  if (!isDefi) return null;
  if (!auditInformationAvailable) return null;

  return (
    <ProjectWidget>
      <div className="flex flex-col gap-2">
        <ProjectWidget.Title>Audits</ProjectWidget.Title>

        {project.meta.auditReportDate && (
          <div className="flex items-center gap-2">
            <ProjectWidget.DataKey>Last audit</ProjectWidget.DataKey>
            <ProjectWidget.DataValue>
              {formatOptionalDate(project.meta.auditReportDate, 'MMM, DD, YYYY')}
            </ProjectWidget.DataValue>
          </div>
        )}
      </div>

      {project.links.audit && (
        <ProjectWidget.CTA link={project.links.audit} analyticsTitle="Audit">
          <Image
            src={IconLink}
            alt={`Visit "${project.title}" audit`}
            className={twMerge('h-6 w-6')}
          />
          View Audit
        </ProjectWidget.CTA>
      )}
    </ProjectWidget>
  );
};
