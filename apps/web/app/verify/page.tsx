import { VerifyForm } from "@/components/VerifyForm";

export default function VerifyPage() {
  return (
    <div>
      <h1 className="text-3xl mb-2">Verify a file</h1>
      <p className="text-muted mb-8">
        Free. No account required. A match means the bytes are unchanged since registration. It does
        not confirm who created the file or what it shows.
      </p>
      <VerifyForm />
    </div>
  );
}
