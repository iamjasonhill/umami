import { useEffect, useMemo } from 'react';
import { Dropdown, Item, Flexbox, Text } from 'react-basics';
import { useMessages, useSelectedWebsite, useWebsites, useTeamUrl } from '@/components/hooks';
import Empty from '@/components/common/Empty';

export function NavWebsiteSelector() {
  const { formatMessage, labels, messages } = useMessages();
  const { teamId } = useTeamUrl();
  const { websiteId, setWebsiteId } = useSelectedWebsite();
  const queryResult = useWebsites({ teamId }, { pageSize: 50 });

  const items = useMemo(() => queryResult.result?.data || [], [queryResult.result?.data]);

  useEffect(() => {
    if (!websiteId && items.length > 0) {
      setWebsiteId(items[0].id);
    }
  }, [websiteId, items, setWebsiteId]);

  const handleChange = (key: any) => {
    setWebsiteId(key as string);
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
