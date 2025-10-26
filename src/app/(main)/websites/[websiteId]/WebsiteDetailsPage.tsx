'use client';
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

  const dashboardUrl = renderTeamUrl('/dashboard');
  const backHref = dashboardPage ? buildUrl(dashboardUrl, { page: dashboardPage }) : dashboardUrl;

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
