import { VerifyForm } from "@/components/VerifyForm";

export default function VerifyPage() {
  return (
    <div className="page page-narrow">
      <p className="kicker">Verify</p>
      <h1 className="text-4xl mb-3">Verify a file</h1>
      <p className="text-muted mb-8">
        Free. No account required. A match means the bytes are unchanged since registration. It does
        not confirm who created the file or what it shows.
      </p>
      <VerifyForm />
    </div>
  );
}
