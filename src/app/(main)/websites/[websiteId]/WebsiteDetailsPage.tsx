'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Icon, Icons, Text } from 'react-basics';
import { usePathname } from 'next/navigation';
import FilterTags from '@/components/metrics/FilterTags';
import { useMessages, useNavigation, useTeamUrl, useWebsiteMetrics } from '@/components/hooks';
import LinkButton from '@/components/common/LinkButton';
import WebsiteChart from './WebsiteChart';
import WebsiteExpandedView from './WebsiteExpandedView';
import WebsiteHeader from './WebsiteHeader';
import WebsiteMetricsBar from './WebsiteMetricsBar';
import WebsiteTableView from './WebsiteTableView';
import { FILTER_COLUMNS, FILTER_GROUPS } from '@/lib/constants';
import { buildUrl } from '@/lib/url';
import PageChannelSummary from '@/components/metrics/PageChannelSummary';

export default function WebsiteDetailsPage({ websiteId }: { websiteId: string }) {
  const { formatMessage, labels } = useMessages();
  const pathname = usePathname();
  const { query, router, renderUrl } = useNavigation();
  const { renderTeamUrl } = useTeamUrl();

  const showLinks = !pathname.includes('/share/');
  const { view, dashboardPage } = query;

  const params = useMemo(() => {
    return Object.keys(query).reduce<Record<string, string>>((obj, key) => {
      if (FILTER_COLUMNS[key] || FILTER_GROUPS[key]) {
        obj[key] = query[key];
      }
      return obj;
    }, {});
  }, [query]);

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

  const pageFilter = params.url as string | undefined;
  const channelFilter = params.channel as string | undefined;

  const { data: entryData, isLoading: isEntryLoading } = useWebsiteMetrics(
    websiteId,
    { type: 'entry', limit: 10 },
    {
      enabled: Boolean(pageFilter),
    },
  );

  const entryMetrics = useMemo(() => {
    return Array.isArray(entryData) ? entryData : [];
  }, [entryData]);

  const channelSummary = useMemo(() => {
    if (!entryMetrics.length || !pageFilter) {
      return null;
    }

    const normalized = entryMetrics.find((row: any) => row?.x === pageFilter) || entryMetrics[0];

    if (!normalized || !normalized.channel) {
      return null;
    }

    return normalized;
  }, [entryMetrics, pageFilter]);

  const handleChannelFilter = useCallback(
    (nextChannel?: string) => {
      router.push(renderUrl({ channel: nextChannel }));
    },
    [renderUrl, router],
  );

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
      {pageFilter && channelSummary && !isEntryLoading && (
        <PageChannelSummary
          channel={channelSummary.channel}
          channelShare={channelSummary.channelShare}
          channels={channelSummary.channels}
          activeChannel={channelFilter}
          onFilter={handleChannelFilter}
        />
      )}
      <WebsiteMetricsBar websiteId={websiteId} showFilter={true} showChange={true} sticky={true} />
      <WebsiteChart websiteId={websiteId} />
      {!view && <WebsiteTableView websiteId={websiteId} />}
      {view && <WebsiteExpandedView websiteId={websiteId} />}
    </>
  );
}
