import { CreateForm } from "@/components/CreateForm";
import { RECORD_STATES } from "@oyokometa/config";

export default function CreatePage() {
  return (
    <div className="wide">
      <h1 className="text-3xl mb-2">Create a provenance record</h1>
      <p className="text-muted mb-6">{RECORD_STATES}</p>
      <CreateForm />
    </div>
  );
}
