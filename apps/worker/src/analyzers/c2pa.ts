import type { C2paState } from "@oyokometa/evidence";
import { failureFromStatus, stateFromStatus, type StatusEntry } from "./c2pa-status.js";
import { ensureTrustAnchors } from "./c2pa-trust.js";

export const C2PA_PRODUCER = "c2pa-worker@2.3.0";
export const C2PA_SPEC = "C2PA Technical Specification 2.3";

export type C2paAnalysis = {
  state: C2paState;
  signer: string | null;
  claim_generator: string | null;
  signed_at: string | null;
  actions: unknown;
  ingredients: unknown;
  ai_assertion: string | null;
  failure_reason: string | null;
  trust_list_version: string;
};

type ManifestStore = {
  active_manifest?: string | null;
  manifests?: Record<string, ManifestJson>;
  validation_status?: StatusEntry[] | null;
  validation_state?: string | null;
  validation_results?: {
    activeManifest?: { failure?: StatusEntry[]; success?: StatusEntry[]; informational?: StatusEntry[] } | null;
    trustListUri?: string | null;
    specVersion?: string | null;
  } | null;
};

type ManifestJson = {
  claim_generator?: string | null;
  claim_generator_info?: Array<{ name?: string; version?: string | null }> | null;
  signature_info?: { issuer?: string | null; time?: string | null; cert_serial_number?: string | null } | null;
  assertions?: Array<{ label?: string; data?: unknown }> | null;
  ingredients?: unknown;
};

export async function refreshTrustList(): Promise<string> {
  const stored = await ensureTrustAnchors();
  return stored.version;
}

export async function analyzeC2pa(buf: Buffer, mimeType = "application/octet-stream"): Promise<C2paAnalysis> {
  const stored = await ensureTrustAnchors();
  const trust_list_version = stored.version;
  try {
    const { Reader, Context } = await import("@contentauth/c2pa-node");
    const context = new Context({
      verify: { verifyAfterReading: true, verifyTrust: true },
      trust: stored.anchorsPath ? { trustAnchors: stored.anchorsPath } : {},
    });
    const reader = await Reader.fromAsset({ buffer: buf, mimeType }, context);
    if (!reader) return empty("not_detected", trust_list_version);
    return mapStore(reader.json() as ManifestStore, trust_list_version);
  } catch (err) {
    const message = err instanceof Error ? err.message : "validator error";
    if (/cannot find module|dlopen|native/i.test(message)) {
      return empty(
        "unable_to_verify",
        trust_list_version,
        `Official C2PA SDK (${C2PA_SPEC}) is not loaded: ${message}`,
      );
    }
    if (/no (claim|manifest)|not found|no c2pa/i.test(message)) {
      return empty("not_detected", trust_list_version);
    }
    return empty("unable_to_verify", trust_list_version, message);
  }
}

export function mapStore(store: ManifestStore, trust_list_version: string): C2paAnalysis {
  const activeLabel = store.active_manifest ?? null;
  const active = activeLabel ? store.manifests?.[activeLabel] : undefined;
  const status = flattenStatus(store);
  const state = stateFromStatus(status, Boolean(activeLabel && active), store.validation_state);
  const actions = extractActions(active);
  return {
    state,
    signer: active?.signature_info?.issuer ?? null,
    claim_generator: claimGenerator(active),
    signed_at: active?.signature_info?.time ?? null,
    actions,
    ingredients: active?.ingredients ?? [],
    ai_assertion: extractAiAssertion(active, actions),
    failure_reason: failureFromStatus(status, state),
    trust_list_version,
  };
}

function flattenStatus(store: ManifestStore): StatusEntry[] {
  const fromLegacy = store.validation_status ?? [];
  const active = store.validation_results?.activeManifest;
  if (!active) return fromLegacy;
  return [
    ...fromLegacy,
    ...(active.failure ?? []).map((s) => ({ ...s, success: false })),
    ...(active.success ?? []).map((s) => ({ ...s, success: true })),
    ...(active.informational ?? []),
  ];
}

function claimGenerator(manifest: ManifestJson | undefined): string | null {
  const info = manifest?.claim_generator_info?.[0];
  if (info?.name) return info.version ? `${info.name} ${info.version}` : info.name;
  return manifest?.claim_generator ?? null;
}

function extractActions(manifest: ManifestJson | undefined): unknown {
  const block = manifest?.assertions?.find((a) => a.label?.startsWith("c2pa.actions"));
  const data = block?.data;
  if (data && Array.isArray((data as { actions?: unknown }).actions)) {
    return (data as { actions: unknown }).actions;
  }
  return [];
}

function extractAiAssertion(manifest: ManifestJson | undefined, actions: unknown): string | null {
  const digital = manifest?.assertions
    ?.map((a) => {
      const data =
        a.data && typeof a.data === "object" ? (a.data as Record<string, unknown>) : {};
      const v = data.digitalSourceType ?? data["Iptc4xmpExt:DigitalSourceType"] ?? data.DigitalSourceType;
      return typeof v === "string" ? v : undefined;
    })
    .find(Boolean);
  if (digital) return digital;
  if (!Array.isArray(actions)) return null;
  const hit = actions.find((a) => {
    if (!a || typeof a !== "object") return false;
    const rec = a as { digitalSourceType?: string; softwareAgent?: string; action?: string };
    return Boolean(rec.digitalSourceType) || /ai|generative/i.test(`${rec.softwareAgent ?? ""} ${rec.action ?? ""}`);
  }) as { digitalSourceType?: string; action?: string } | undefined;
  return hit?.digitalSourceType ?? hit?.action ?? null;
}

function empty(state: C2paState, trust_list_version: string, failure_reason: string | null = null): C2paAnalysis {
  return {
    state,
    signer: null,
    claim_generator: null,
    signed_at: null,
    actions: [],
    ingredients: [],
    ai_assertion: null,
    failure_reason,
    trust_list_version,
  };
}
