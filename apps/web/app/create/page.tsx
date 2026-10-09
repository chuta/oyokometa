import { CreateForm } from "@/components/CreateForm";
import { RECORD_STATES } from "@oyokometa/config";

export default function CreatePage() {
  return (
    <div className="page">
      <p className="kicker">Create</p>
      <h1 className="text-4xl mb-3">Create a provenance record</h1>
      <p className="text-muted mb-8 max-w-3xl">{RECORD_STATES}</p>
      <CreateForm />
    </div>
  );
}
