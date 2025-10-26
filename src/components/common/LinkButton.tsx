import { ReactNode } from 'react';
import classNames from 'classnames';
import Link from 'next/link';
import { useLocale } from '@/components/hooks';
import styles from './LinkButton.module.css';

export interface LinkButtonProps {
  href: string;
  className?: string;
  variant?: string;
  scroll?: boolean;
  onClick?: (event: React.MouseEvent<HTMLAnchorElement>) => void;
  children?: ReactNode;
}

export function LinkButton({
  href,
  className,
  variant,
  scroll = true,
  onClick,
  children,
}: LinkButtonProps) {
  const { dir } = useLocale();

  return (
    <Link
      className={classNames(styles.button, className, variant && styles[variant])}
      href={href}
      dir={dir}
      scroll={scroll}
      onClick={onClick}
    >
      {children}
    </Link>
  );
}

export default LinkButton;
