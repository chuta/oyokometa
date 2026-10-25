import type { Metadata } from "next";
import { CivicReceipt } from "@/components/CivicReceipt";

export const metadata: Metadata = {
  title: "Submission receipt | Oyokometa",
  robots: { index: false, follow: false },
};

export default async function CivicReceiptPage({ params }: { params: Promise<{ reference: string }> }) {
  const { reference } = await params;
  return (
    <article className="page">
      <p className="kicker">Civic Evidence</p>
      <h1 className="text-4xl mb-3">Submission received</h1>
      <CivicReceipt reference={reference} />
    </article>
  );
}
