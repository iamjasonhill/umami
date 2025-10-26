'use client';
import { useEffect, useMemo, useState } from 'react';
import { Icon, Icons, Text } from 'react-basics';
import { usePathname } from 'next/navigation';
import FilterTags from '@/components/metrics/FilterTags';
import { useMessages, useNavigation, useTeamUrl } from '@/components/hooks';
import LinkButton from '@/components/common/LinkButton';
import WebsiteChart from './WebsiteChart';
import WebsiteExpandedView from './WebsiteExpandedView';
import WebsiteHeader from './WebsiteHeader';
import WebsiteMetricsBar from './WebsiteMetricsBar';
import WebsiteTableView from './WebsiteTableView';
import { FILTER_COLUMNS, FILTER_GROUPS } from '@/lib/constants';
import { buildUrl } from '@/lib/url';

export default function WebsiteDetailsPage({ websiteId }: { websiteId: string }) {
  const { formatMessage, labels } = useMessages();
  const pathname = usePathname();
  const { query } = useNavigation();
  const { renderTeamUrl } = useTeamUrl();

  const showLinks = !pathname.includes('/share/');
  const { view, dashboardPage } = query;

  const params = Object.keys(query).reduce((obj, key) => {
    if (FILTER_COLUMNS[key] || FILTER_GROUPS[key]) {
      obj[key] = query[key];
    }
    return obj;
  }, {});

  const dashboardUrl = useMemo(() => renderTeamUrl('/dashboard'), [renderTeamUrl]);
  const [backHref, setBackHref] = useState(dashboardUrl);

  useEffect(() => {
    const normalizedDashboardPage = Number.parseInt(dashboardPage as string, 10);
    let targetPage =
      !Number.isNaN(normalizedDashboardPage) && normalizedDashboardPage > 0
        ? normalizedDashboardPage
        : undefined;

    if (!targetPage && typeof window !== 'undefined') {
      const storageKey = `dashboard-page:${dashboardUrl}`;
      const stored = Number.parseInt(sessionStorage.getItem(storageKey) || '', 10);
      if (!Number.isNaN(stored) && stored > 0) {
        targetPage = stored;
      }
    }

    setBackHref(targetPage ? buildUrl(dashboardUrl, { page: targetPage }) : dashboardUrl);
  }, [dashboardPage, dashboardUrl]);

  return (
    <>
      <div style={{ marginBottom: 16 }}>
        <LinkButton href={backHref} variant="secondary">
          <Icon rotate={180}>
            <Icons.ArrowRight />
          </Icon>
          <Text>{formatMessage(labels.backToDashboard)}</Text>
        </LinkButton>
      </div>
      <WebsiteHeader websiteId={websiteId} showLinks={showLinks} />
      <FilterTags websiteId={websiteId} params={params} />
      <WebsiteMetricsBar websiteId={websiteId} showFilter={true} showChange={true} sticky={true} />
      <WebsiteChart websiteId={websiteId} />
      {!view && <WebsiteTableView websiteId={websiteId} />}
      {view && <WebsiteExpandedView websiteId={websiteId} />}
    </>
  );
}
