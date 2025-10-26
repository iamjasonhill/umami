import { useMemo } from 'react';
import { Text } from 'react-basics';
import { useMessages } from '@/components/hooks';
import ChannelBadge from './ChannelBadge';
import styles from './PageChannelSummary.module.css';

export interface PageChannelSummaryProps {
  channel?: string;
  channelShare?: number;
  channels?: { channel: string | null; count: number; share: number }[];
  activeChannel?: string;
  onFilter?: (channel?: string) => void;
}

export function PageChannelSummary({
  channel,
  channelShare,
  channels = [],
  activeChannel,
  onFilter,
}: PageChannelSummaryProps) {
  const { formatMessage, labels } = useMessages();

  const topChannel = channel ?? channels?.[0]?.channel ?? null;
  const topShare = channelShare ?? channels?.[0]?.share ?? 0;

  const secondaryChannels = useMemo(() => {
    return channels.filter(item => item.channel && item.channel !== topChannel).slice(0, 3);
  }, [channels, topChannel]);

  if (!topChannel) {
    return null;
  }

  const isTopActive = topChannel === activeChannel;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Text className={styles.title}>{formatMessage(labels.channel)}</Text>
        <ChannelBadge
          channel={topChannel}
          share={topShare}
          active={isTopActive}
          onSelect={() => onFilter?.(isTopActive ? undefined : topChannel || undefined)}
        />
      </div>
      {secondaryChannels.length > 0 && (
        <div className={styles.breakdown}>
          {secondaryChannels.map(item => {
            const isActive = item.channel === activeChannel;

            return (
              <ChannelBadge
                key={item.channel as string}
                channel={item.channel as string}
                share={item.share}
                active={isActive}
                onSelect={() => onFilter?.(isActive ? undefined : (item.channel as string))}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

export default PageChannelSummary;
