import CampaignDetailContent from "./CampaignDetailContent";

export const dynamic = "force-dynamic";

export default function CampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <CampaignDetailContent params={params} />;
}
