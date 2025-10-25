'use client';

import { ReactNode, useEffect, useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { Flexbox } from 'react-basics';
import SideNav from '@/components/layout/SideNav';
import styles from './WebsiteWorkspaceLayout.module.css';
import { useMessages, useSelectedWebsite, useTeamUrl } from '@/components/hooks';

export interface WebsiteWorkspaceLayoutProps {
  children: ReactNode;
  websiteId: string;
}

export function WebsiteWorkspaceLayout({ children, websiteId }: WebsiteWorkspaceLayoutProps) {
  const pathname = usePathname();
  const { formatMessage, labels } = useMessages();
  const { renderTeamUrl } = useTeamUrl();
  const { setWebsiteId } = useSelectedWebsite();
  const analyticsPath = renderTeamUrl(`/websites/${websiteId}/analytics`);
  const goalsPath = renderTeamUrl(`/websites/${websiteId}/goals`);
  const utmPath = renderTeamUrl(`/websites/${websiteId}/utm`);
  const settingsPath = renderTeamUrl(`/settings/websites/${websiteId}`);

  useEffect(() => {
    if (websiteId) {
      setWebsiteId(websiteId);
    }
  }, [websiteId, setWebsiteId]);

  const items = [
    { key: 'overview', label: formatMessage(labels.overview), url: analyticsPath },
    { key: 'goals', label: formatMessage(labels.goals), url: goalsPath },
    { key: 'utm', label: formatMessage(labels.utm), url: utmPath },
    { key: 'settings', label: formatMessage(labels.settings), url: settingsPath },
  ];

  const selectedKey = useMemo(() => {
    const match = items.find(item => pathname.startsWith(item.url));
    return match?.key ?? 'overview';
  }, [items, pathname]);

  return (
    <div className={styles.layout}>
      <aside className={styles.sidebar}>
        <SideNav items={items} selectedKey={selectedKey} shallow={false} scroll={true} />
      </aside>
      <Flexbox className={styles.content} direction="column" gap={24}>
        {children}
      </Flexbox>
    </div>
  );
}

export default WebsiteWorkspaceLayout;
