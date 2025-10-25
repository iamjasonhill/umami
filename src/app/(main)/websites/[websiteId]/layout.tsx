import { Metadata } from 'next';
import WebsiteProvider from './WebsiteProvider';
import WebsiteWorkspaceLayout from '@/components/layout/WebsiteWorkspaceLayout';

export default async function ({
  children,
  params,
}: {
  children: any;
  params: Promise<{ websiteId: string }>;
}) {
  const { websiteId } = await params;

  return (
    <WebsiteProvider websiteId={websiteId}>
      <WebsiteWorkspaceLayout websiteId={websiteId}>{children}</WebsiteWorkspaceLayout>
    </WebsiteProvider>
  );
}

export const metadata: Metadata = {
  title: {
    template: '%s | Umami',
    default: 'Websites | Umami',
  },
};
