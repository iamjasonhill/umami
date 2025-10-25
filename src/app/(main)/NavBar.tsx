'use client';
import { Icon, Text } from 'react-basics';
import Link from 'next/link';
import classNames from 'classnames';
import HamburgerButton from '@/components/common/HamburgerButton';
import ThemeButton from '@/components/input/ThemeButton';
import LanguageButton from '@/components/input/LanguageButton';
import ProfileButton from '@/components/input/ProfileButton';
import Icons from '@/components/icons';
import { useMessages, useNavigation, useTeamUrl } from '@/components/hooks';
import styles from './NavBar.module.css';

export function NavBar() {
  const { formatMessage, labels } = useMessages();
  const { pathname } = useNavigation();
  const { renderTeamUrl } = useTeamUrl();

  const cloudMode = process.env.cloudMode === 'true';

  const links = [
    { label: formatMessage(labels.dashboard), url: renderTeamUrl('/dashboard') },
    { label: formatMessage(labels.websites), url: renderTeamUrl('/websites') },
    !cloudMode && { label: formatMessage(labels.utm), url: renderTeamUrl('/reports/utm') },
    { label: formatMessage(labels.reports), url: renderTeamUrl('/reports') },
    { label: formatMessage(labels.settings), url: renderTeamUrl('/settings') },
    !cloudMode && { label: formatMessage(labels.goals), url: renderTeamUrl('/settings/websites') },
  ].filter(n => n);

  const menuItems = [
    {
      label: formatMessage(labels.dashboard),
      url: renderTeamUrl('/dashboard'),
    },
    !cloudMode && {
      label: formatMessage(labels.utm),
      url: renderTeamUrl('/reports/utm'),
    },
    !cloudMode && {
      label: formatMessage(labels.settings),
      url: renderTeamUrl('/settings'),
      children: [
        {
          label: formatMessage(labels.websites),
          url: renderTeamUrl('/settings/websites'),
        },
      ],
    },
    {
      label: formatMessage(labels.profile),
      url: '/profile',
    },
    !cloudMode && {
      label: formatMessage(labels.goals),
      url: renderTeamUrl('/settings/websites'),
    },
    !cloudMode && { label: formatMessage(labels.logout), url: '/logout' },
  ].filter(n => n);

  return (
    <div className={styles.navbar}>
      <div className={styles.logo}>
        <Icon size="lg">
          <Icons.Logo />
        </Icon>
        <Text>umami</Text>
      </div>
      <div className={styles.links}>
        {links.map(({ url, label }) => {
          return (
            <Link
              key={url}
              href={url}
              className={classNames({ [styles.selected]: pathname.startsWith(url) })}
              prefetch={url !== '/settings'}
            >
              <Text>{label}</Text>
            </Link>
          );
        })}
      </div>
      <div className={styles.actions}>
        <ThemeButton />
        <LanguageButton />
        <ProfileButton />
      </div>
      <div className={styles.mobile}>
        <HamburgerButton menuItems={menuItems} />
      </div>
    </div>
  );
}

export default NavBar;
