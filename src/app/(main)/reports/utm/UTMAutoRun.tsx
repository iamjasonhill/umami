'use client';

import { useContext, useEffect } from 'react';
import { ReportContext } from '../[reportId]/Report';

export default function UTMAutoRun({
  parameters,
}: {
  parameters: {
    websiteId?: string;
    dateRange?: {
      startDate?: Date | string;
      endDate?: Date | string;
      value?: string;
      unit?: string;
    };
  };
}) {
  const context = useContext(ReportContext);
  const report = context?.report;
  const runReport = context?.runReport;

  useEffect(() => {
    if (!report?.data && runReport && parameters?.websiteId && parameters?.dateRange) {
      runReport(parameters);
    }
  }, [report?.data, runReport, parameters?.websiteId, parameters?.dateRange]);

  return null;
}
