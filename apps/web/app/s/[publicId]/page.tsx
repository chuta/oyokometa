import { FindingsDashboard } from "@oyokometa/findings-ui";
import { LIMITATIONS_BLOCK, PUBLIC_PAGE_STANDING_LINE } from "@oyokometa/config";
import { notFound } from "next/navigation";

export const metadata = { robots: { index: false, follow: false } };

export default async function SharePage({ params }: { params: Promise<{ publicId: string }> }) {
  const { publicId } = await params;
  const api = process.env.API_PUBLIC_URL ?? "http://localhost:4000";
  const res = await fetch(`${api}/api/v1/share/${publicId}`, { cache: "no-store" });
  if (!res.ok) notFound();
  const data = await res.json();
  return (
    <div className="page">
      <p className="kicker">Shared analysis</p>
      <p className="mb-4">
        {data.banner}. Acquisition time (UTC): {data.acquisition_time_utc}
      </p>
      <FindingsDashboard
        findings={data.findings}
        previewUrl={data.preview_available ? `/api/v1/share/${publicId}/preview` : null}
      />
      <p className="mt-8 text-sm">{PUBLIC_PAGE_STANDING_LINE}</p>
      <p className="text-sm">{LIMITATIONS_BLOCK}</p>
      <p className="mt-4">
        <a href="/abuse">Report abuse</a>
      </p>
    </div>
  );
}
