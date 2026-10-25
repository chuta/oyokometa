import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CivicCase, type PublicCase } from "@/components/CivicCase";

const API = process.env.API_PUBLIC_URL ?? "http://localhost:4000";

async function load(reference: string, version: number) {
  const res = await fetch(
    `${API}/api/v1/civic/public/${encodeURIComponent(reference)}/versions/${version}`,
    { cache: "no-store" },
  );
  if (!res.ok) return null;
  return (await res.json()) as PublicCase;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ reference: string; n: string }>;
}): Promise<Metadata> {
  const { reference, n } = await params;
  return {
    title: `${reference} version ${n} | Civic Evidence | Oyokometa`,
    robots: { index: false, follow: false },
  };
}

export default async function CivicVersionPage({ params }: { params: Promise<{ reference: string; n: string }> }) {
  const { reference, n } = await params;
  const version = Number(n);
  if (!Number.isInteger(version) || version < 1) notFound();
  const page = await load(reference, version);
  if (!page) notFound();
  return (
    <article className="page">
      <p className="kicker">Civic Evidence</p>
      <h1 className="text-4xl mb-3">Reviewed case</h1>
      <CivicCase page={page} />
    </article>
  );
}
