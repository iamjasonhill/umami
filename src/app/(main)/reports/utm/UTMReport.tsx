'use client';
import { useMemo } from 'react';
import Report from '../[reportId]/Report';
import ReportHeader from '../[reportId]/ReportHeader';
import ReportMenu from '../[reportId]/ReportMenu';
import ReportBody from '../[reportId]/ReportBody';
import UTMParameters from './UTMParameters';
import UTMView from './UTMView';
import Tag from '@/assets/tag.svg';
import { REPORT_TYPES } from '@/lib/constants';
import { useDateRange } from '@/components/hooks';
import UTMAutoRun from './UTMAutoRun';

interface UTMReportProps {
  reportId?: string;
  websiteId?: string;
  allowWebsiteSelect?: boolean;
}

export default function UTMReport({
  reportId,
  websiteId,
  allowWebsiteSelect = true,
}: UTMReportProps) {
  const { dateRange } = useDateRange(websiteId);
  const defaultParameters = useMemo(
    () => ({
      type: REPORT_TYPES.utm,
      parameters: {
        ...(websiteId ? { websiteId } : {}),
        ...(dateRange ? { dateRange } : {}),
      },
    }),
    [websiteId, dateRange],
  );

  return (
    <Report reportId={reportId} defaultParameters={defaultParameters}>
      <UTMAutoRun parameters={defaultParameters.parameters} />
      <ReportHeader icon={<Tag />} />
      <ReportMenu>
        <UTMParameters allowWebsiteSelect={allowWebsiteSelect} />
      </ReportMenu>
      <ReportBody>
        <UTMView />
      </ReportBody>
    </Report>
  );
}
