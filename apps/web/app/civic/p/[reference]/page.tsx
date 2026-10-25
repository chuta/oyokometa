import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CivicCase, type PublicCase } from "@/components/CivicCase";

const API = process.env.API_PUBLIC_URL ?? "http://localhost:4000";

async function load(reference: string, version: number | null) {
  const path =
    version == null
      ? `${API}/api/v1/civic/public/${encodeURIComponent(reference)}`
      : `${API}/api/v1/civic/public/${encodeURIComponent(reference)}/versions/${version}`;
  const res = await fetch(path, { cache: "no-store" });
  if (!res.ok) return null;
  return (await res.json()) as PublicCase;
}

export async function generateMetadata({ params }: { params: Promise<{ reference: string }> }): Promise<Metadata> {
  const { reference } = await params;
  const page = await load(reference, null);
  if (!page) return { title: "Not found | Oyokometa", robots: { index: false, follow: false } };
  return {
    title: `${page.reference} | Civic Evidence | Oyokometa`,
    description: page.assessment_line,
    alternates: { canonical: `/civic/p/${page.reference}` },
  };
}

export default async function CivicPublicPage({ params }: { params: Promise<{ reference: string }> }) {
  const { reference } = await params;
  const page = await load(reference, null);
  if (!page) notFound();
  return (
    <article className="page">
      <p className="kicker">Civic Evidence</p>
      <h1 className="text-4xl mb-3">Reviewed case</h1>
      <CivicCase page={page} />
    </article>
  );
}
