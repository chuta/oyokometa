import { PublicRecord } from "@/components/PublicRecord";

export default async function VerifyRecordPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const { publicId } = await params;
  return <PublicRecord publicId={publicId} />;
}
