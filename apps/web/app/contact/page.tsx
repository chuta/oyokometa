import type { Metadata } from "next";
import { ContactForm } from "@/components/ContactForm";

export const metadata: Metadata = {
  title: "Contact | Oyokometa",
  description: "Send Oyokometa a note about the product, a report, or something that should be clearer.",
  alternates: { canonical: "/contact" },
  openGraph: {
    title: "Contact | Oyokometa",
    description: "Send Oyokometa a note about the product, a report, or something that should be clearer.",
    url: "/contact",
    images: ["/favicon.png"],
  },
};

export default function ContactPage() {
  return (
    <article className="page about-page">
      <header className="about-hero">
        <p className="kicker">Contact</p>
        <h1>Send a note.</h1>
        <p className="lede">
          Questions about a report, the product, or something that should be clearer belong here. For
          a scoped engagement, use Request a Solution.
        </p>
      </header>
      <ContactForm />
    </article>
  );
}
