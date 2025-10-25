import WebsiteDetailsPage from '../WebsiteDetailsPage';

export default async function WebsiteAnalyticsPage({
  params,
}: {
  params: Promise<{ websiteId: string }>;
}) {
  const { websiteId } = await params;

  return <WebsiteDetailsPage websiteId={websiteId} />;
}
