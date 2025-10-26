import classNames from 'classnames';
import { useCallback, MouseEvent } from 'react';
import { useLocale, useMessages } from '@/components/hooks';
import styles from './ChannelBadge.module.css';

export interface ChannelBadgeProps {
  channel: string;
  share?: number;
  active?: boolean;
  onSelect?: (channel: string) => void;
}

export function ChannelBadge({ channel, share, active = false, onSelect }: ChannelBadgeProps) {
  const { locale } = useLocale();
  const { formatMessage, labels } = useMessages();

  const label = labels[channel] ? formatMessage(labels[channel]) : channel;
  const handleClick = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation();
      onSelect?.(channel);
    },
    [channel, onSelect],
  );

  const formattedShare =
    typeof share === 'number'
      ? new Intl.NumberFormat(locale, {
          style: 'percent',
          maximumFractionDigits: share > 0 && share < 0.1 ? 1 : 0,
        }).format(Math.max(0, Math.min(share, 1)))
      : null;

  return (
    <button
      type="button"
      className={classNames(styles.badge, { [styles.active]: active })}
      onClick={handleClick}
    >
      <span className={styles.name}>{label}</span>
      {formattedShare && <span className={styles.share}>{formattedShare}</span>}
    </button>
  );
}

export default ChannelBadge;
