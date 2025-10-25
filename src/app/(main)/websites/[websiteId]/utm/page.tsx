import UTMReport from '@/app/(main)/reports/utm/UTMReport';

export default async function WebsiteUtmPage({
  params,
}: {
  params: Promise<{ websiteId: string }>;
}) {
  const { websiteId } = await params;

  return <UTMReport websiteId={websiteId} allowWebsiteSelect={false} />;
}
