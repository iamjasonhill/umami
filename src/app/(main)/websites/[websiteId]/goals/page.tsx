import GoalsTable from '@/app/(main)/settings/websites/[websiteId]/GoalsTable';

export default async function WebsiteGoalsPage({
  params,
}: {
  params: Promise<{ websiteId: string }>;
}) {
  const { websiteId } = await params;

  return <GoalsTable websiteId={websiteId} />;
}
