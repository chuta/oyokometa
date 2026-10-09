import type { C2paState } from "@oyokometa/evidence";

export const C2PA_PRODUCER = "c2pa-worker@1.0.0";

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

let cachedList = { version: "unfetched", fetchedAt: 0 };

export async function refreshTrustList(): Promise<string> {
  if (Date.now() - cachedList.fetchedAt < 24 * 3600 * 1000 && cachedList.version !== "unfetched") {
    return cachedList.version;
  }
  try {
    const res = await fetch("https://caoclist.adobe.com/config.cfg", { signal: AbortSignal.timeout(10_000) });
    if (res.ok) {
      cachedList = { version: `cached-${new Date().toISOString().slice(0, 10)}`, fetchedAt: Date.now() };
      return cachedList.version;
    }
  } catch {
    /* offline / sandbox: keep last */
  }
  cachedList = { version: cachedList.version === "unfetched" ? "offline-cache" : cachedList.version, fetchedAt: Date.now() };
  return cachedList.version;
}

export async function analyzeC2pa(buf: Buffer): Promise<C2paAnalysis> {
  const trust_list_version = await refreshTrustList();
  const looksLikeJumbf = buf.includes(Buffer.from("c2pa")) || buf.includes(Buffer.from("jumb"));
  try {
    const sdkName = "@contentauth/c2pa-node";
    const mod = await import(sdkName).catch(() => null);
    if (!mod) {
      if (!looksLikeJumbf) {
        return empty("not_detected", trust_list_version);
      }
      return empty("unable_to_verify", trust_list_version, "Official C2PA SDK not loaded in this environment");
    }
    const read = (mod as { readC2pa?: (b: Buffer) => Promise<unknown> }).readC2pa;
    if (!read) return empty("unable_to_verify", trust_list_version, "SDK binding missing");
    const manifest = await read(buf);
    return mapManifest(manifest, trust_list_version);
  } catch (err) {
    return empty("unable_to_verify", trust_list_version, err instanceof Error ? err.message : "validator error");
  }
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

function mapManifest(manifest: unknown, trust_list_version: string): C2paAnalysis {
  const m = manifest as {
    isTrusted?: boolean;
    validationStatus?: string;
    signer?: string;
    claimGenerator?: string;
    signatureValid?: boolean;
    actions?: unknown;
    ingredients?: unknown;
    digitalSourceType?: string;
  };
  let state: C2paState = "not_detected";
  if (!manifest) state = "not_detected";
  else if (m.signatureValid === false) state = "invalid";
  else if (m.signatureValid && m.isTrusted) state = "verified_and_trusted";
  else if (m.signatureValid && !m.isTrusted) state = "valid_signer_not_recognised";
  else state = "unable_to_verify";
  return {
    state,
    signer: m.signer ?? null,
    claim_generator: m.claimGenerator ?? null,
    signed_at: null,
    actions: m.actions ?? [],
    ingredients: m.ingredients ?? [],
    ai_assertion: m.digitalSourceType ?? null,
    failure_reason: state === "invalid" ? m.validationStatus ?? "signature or binding check failed" : null,
    trust_list_version,
  };
}
