'use client';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Icon, Icons, Loading, Text } from 'react-basics';
import PageHeader from '@/components/layout/PageHeader';
import Pager from '@/components/common/Pager';
import WebsiteChartList from '../websites/[websiteId]/WebsiteChartList';
import DashboardSettingsButton from '@/app/(main)/dashboard/DashboardSettingsButton';
import DashboardEdit from '@/app/(main)/dashboard/DashboardEdit';
import EmptyPlaceholder from '@/components/common/EmptyPlaceholder';
import { useMessages, useLocale, useTeamUrl, useWebsites, useNavigation } from '@/components/hooks';
import useDashboard from '@/store/dashboard';
import LinkButton from '@/components/common/LinkButton';

export function DashboardPage() {
  const { formatMessage, labels, messages } = useMessages();
  const { teamId, renderTeamUrl } = useTeamUrl();
  const { showCharts, editing, isEdited } = useDashboard();
  const { dir } = useLocale();
  const pageSize = isEdited ? 200 : 10;

  const { result, query, params, setParams } = useWebsites({ teamId }, { pageSize });
  const { query: urlQuery, router, renderUrl } = useNavigation();
  const pathname = usePathname();
  const queryPage = Number.parseInt(urlQuery.page as string, 10);
  const normalizedQueryPage = Number.isNaN(queryPage) || queryPage < 1 ? 1 : queryPage;
  const storageKey = `dashboard-page:${pathname}`;
  const storedPage = Number.parseInt(
    typeof window !== 'undefined' ? sessionStorage.getItem(storageKey) || '' : '',
    10,
  );
  const currentPage =
    !Number.isNaN(storedPage) && !urlQuery.page ? storedPage : normalizedQueryPage;
  const hasData = !!result?.data?.length;

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const targetPage = Number(params.page) || currentPage;
    sessionStorage.setItem(storageKey, String(targetPage));

    if (!urlQuery.page && targetPage !== normalizedQueryPage) {
      setParams(prev => ({ ...prev, page: targetPage }));
    }
  }, [currentPage, params.page, setParams, storageKey, urlQuery.page, normalizedQueryPage]);

  const handlePageChange = (page: number) => {
    setParams({ ...params, page });
    router.push(renderUrl({ page }));
  };

  if (query.isLoading) {
    return <Loading />;
  }

  return (
    <section style={{ marginBottom: 60 }}>
      <PageHeader title={formatMessage(labels.dashboard)}>
        {!editing && hasData && <DashboardSettingsButton />}
      </PageHeader>
      {!hasData && (
        <EmptyPlaceholder message={formatMessage(messages.noWebsitesConfigured)}>
          <LinkButton href={renderTeamUrl('/settings')}>
            <Icon rotate={dir === 'rtl' ? 180 : 0}>
              <Icons.ArrowRight />
            </Icon>
            <Text>{formatMessage(messages.goToSettings)}</Text>
          </LinkButton>
        </EmptyPlaceholder>
      )}
      {hasData && (
        <>
          {editing && <DashboardEdit teamId={teamId} />}
          {!editing && (
            <>
              <WebsiteChartList
                websites={result?.data as any}
                showCharts={showCharts}
                limit={pageSize}
                dashboardPage={currentPage}
              />
              <Pager
                page={currentPage}
                pageSize={pageSize}
                count={result?.count}
                onPageChange={handlePageChange}
              />
            </>
          )}
        </>
      )}
    </section>
  );
}

export default DashboardPage;
