import { Metadata } from 'next';
import { redirect } from 'next/navigation';

export default async function WebsitePage({ params }: { params: { websiteId: string } }) {
  const { websiteId } = await params;

  redirect(`/websites/${websiteId}/analytics`);
}

export const metadata: Metadata = {
  title: 'Websites',
};
