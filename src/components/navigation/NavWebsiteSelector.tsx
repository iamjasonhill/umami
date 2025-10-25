import { useEffect, useMemo } from 'react';
import { Dropdown, Item, Flexbox, Text } from 'react-basics';
import {
  useMessages,
  useSelectedWebsite,
  useWebsites,
  useTeamUrl,
  useNavigation,
} from '@/components/hooks';
import Empty from '@/components/common/Empty';

export function NavWebsiteSelector() {
  const { formatMessage, labels, messages } = useMessages();
  const { teamId, renderTeamUrl } = useTeamUrl();
  const { websiteId, setWebsiteId } = useSelectedWebsite();
  const { pathname, router, query } = useNavigation();
  const queryResult = useWebsites({ teamId }, { pageSize: 50 });

  const items = useMemo(() => queryResult.result?.data || [], [queryResult.result?.data]);

  useEffect(() => {
    if (!websiteId && items.length > 0) {
      setWebsiteId(items[0].id);
    }
  }, [websiteId, items, setWebsiteId]);

  const handleChange = (key: any) => {
    const nextWebsiteId = key as string;

    setWebsiteId(nextWebsiteId);

    const prefix = teamId ? `/teams/${teamId}/websites/` : '/websites/';
    const isWebsitePath = pathname.startsWith(prefix);
    let suffix = '/analytics';

    if (isWebsitePath) {
      const rest = pathname.slice(prefix.length);
      const slashIndex = rest.indexOf('/');
      const currentSuffix = slashIndex >= 0 ? rest.slice(slashIndex) : '';

      suffix = currentSuffix || '/analytics';
    }

    const target = renderTeamUrl(`/websites/${nextWebsiteId}${suffix}`);
    const searchParams = isWebsitePath ? new URLSearchParams(query).toString() : '';
    const nextUrl = searchParams ? `${target}?${searchParams}` : target;

    router.push(nextUrl);
  };

  return (
    <Dropdown
      menuProps={{ style: { minWidth: 220, maxHeight: 320 } }}
      value={websiteId}
      items={items as any[]}
      allowSearch
      placeholder={formatMessage(labels.selectWebsite)}
      renderEmpty={() => <Empty message={formatMessage(messages.noResultsFound)} />}
      onChange={handleChange}
      isLoading={queryResult.query.isLoading}
    >
      {(item: any) => (
        <Item key={item.id}>
          <Flexbox direction="column" gap={2}>
            <Text>{item.name}</Text>
            {item.domain && (
              <Text style={{ fontSize: 12, color: 'var(--gray600)' }}>{item.domain}</Text>
            )}
          </Flexbox>
        </Item>
      )}
    </Dropdown>
  );
}

export default NavWebsiteSelector;
