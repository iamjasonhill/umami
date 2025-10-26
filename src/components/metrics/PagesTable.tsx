import { WebsiteContext } from '@/app/(main)/websites/[websiteId]/WebsiteProvider';
import FilterButtons from '@/components/common/FilterButtons';
import FilterLink from '@/components/common/FilterLink';
import { Flexbox } from 'react-basics';
import { useMessages, useNavigation } from '@/components/hooks';
import { emptyFilter } from '@/lib/filters';
import { useContext, useMemo } from 'react';
import MetricsTable, { MetricsTableProps } from './MetricsTable';
import ChannelBadge from './ChannelBadge';
import styles from './PagesTable.module.css';

export interface PagesTableProps extends MetricsTableProps {
  allowFilter?: boolean;
}

export function PagesTable({ allowFilter, ...props }: PagesTableProps) {
  const {
    router,
    renderUrl,
    query: { view = 'url' },
  } = useNavigation();
  const { formatMessage, labels } = useMessages();
  const { domain } = useContext(WebsiteContext);

  const showChannel = view === 'entry';

  const handleSelect = (key: any) => {
    router.push(renderUrl({ view: key }), { scroll: false });
  };

  const channelFilterValue = useMemo(() => props?.params?.channel, [props?.params?.channel]);

  const buttons = [
    {
      label: formatMessage(labels.path),
      key: 'url',
    },
    {
      label: formatMessage(labels.entry),
      key: 'entry',
    },
    {
      label: formatMessage(labels.exit),
      key: 'exit',
    },
    {
      label: formatMessage(labels.title),
      key: 'title',
    },
  ];

  const renderLink = ({ x, channel, channelShare }) => {
    return (
      <div className={styles.row}>
        <FilterLink
          className={styles.link}
          id={view === 'entry' || view === 'exit' ? 'url' : view}
          value={x}
          label={!x && formatMessage(labels.none)}
          externalUrl={
            view !== 'title'
              ? `${domain.startsWith('http') ? domain : `https://${domain}`}${x}`
              : null
          }
        />
        {showChannel && channel && (
          <ChannelBadge
            channel={channel}
            share={channelShare}
            active={channelFilterValue === channel}
            onSelect={value => {
              router.push(renderUrl({ channel: channelFilterValue === value ? undefined : value }));
            }}
          />
        )}
      </div>
    );
  };

  const renderChannelFilter = useMemo(() => {
    if (!showChannel || !channelFilterValue) {
      return null;
    }

    return (
      <ChannelBadge
        channel={channelFilterValue}
        active
        onSelect={() => {
          router.push(renderUrl({ channel: undefined }));
        }}
      />
    );
  }, [channelFilterValue, renderUrl, router, showChannel]);

  return (
    <MetricsTable
      {...props}
      title={formatMessage(labels.pages)}
      type={view}
      metric={formatMessage(labels.visitors)}
      dataFilter={emptyFilter}
      renderLabel={renderLink}
      params={showChannel ? { ...props.params, channel: channelFilterValue } : props.params}
      allowSearch={!showChannel}
    >
      <Flexbox gap={8} alignItems="center">
        {allowFilter && (
          <FilterButtons items={buttons} selectedKey={view} onSelect={handleSelect} />
        )}
        {renderChannelFilter}
      </Flexbox>
    </MetricsTable>
  );
}

export default PagesTable;
