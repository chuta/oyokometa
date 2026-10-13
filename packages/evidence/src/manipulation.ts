export type ManipulationCheck = {
  status: "authentic" | "suspicious" | "manipulated" | "not_applicable";
  label: string;
  detail: string;
};

const COPY: Record<ManipulationCheck["status"], { label: string; detail: string }> = {
  authentic: {
    label: "Authentic",
    detail: "Low likelihood of manipulation. This is an inference. It does not establish that the scene is genuine.",
  },
  suspicious: {
    label: "Suspicious",
    detail: "Moderate likelihood of manipulation. This is an inference and can be wrong.",
  },
  manipulated: {
    label: "Manipulated",
    detail: "High likelihood of manipulation or generation. It does not mean the whole image was generated.",
  },
  not_applicable: {
    label: "Not applicable",
    detail: "This check did not apply to this image.",
  },
};

/** Reads one ensemble result. Other detectors stay behind the label gate. */
export function manipulationCheckFromRaw(payload: unknown): ManipulationCheck | null {
  if (!payload || typeof payload !== "object") return null;
  const row = payload as {
    model_id?: unknown;
    status?: unknown;
    not_applicable_reason?: unknown;
    models_disagree?: unknown;
  };
  if (row.model_id !== "adapter-c" || typeof row.status !== "string") return null;
  const status = checkStatus(row.status);
  if (!status) return null;
  const base = COPY[status];
  const reason = status === "not_applicable" && typeof row.not_applicable_reason === "string" ? row.not_applicable_reason : "";
  const detail = [reason || base.detail, row.models_disagree ? "The models behind this check did not all agree." : ""]
    .filter(Boolean)
    .join(" ");
  return { status, label: base.label, detail };
}

function checkStatus(status: string): ManipulationCheck["status"] | null {
  if (status === "AUTHENTIC") return "authentic";
  if (status === "SUSPICIOUS") return "suspicious";
  if (status === "FAKE" || status === "MANIPULATED") return "manipulated";
  if (status === "NOT_APPLICABLE") return "not_applicable";
  return null;
}
