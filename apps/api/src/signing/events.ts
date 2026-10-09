import { createHash } from "node:crypto";
import { canonicalJson } from "@oyokometa/shared";
import type { KmsSigner } from "./kms.js";

export const EVENT_TYPES = [
  "REGISTERED",
  "DECLARATION_ADDED",
  "VISIBILITY_CHANGED",
  "DISPUTED",
  "WITHDRAWN",
] as const;

export type EventType = (typeof EVENT_TYPES)[number];

export function sha256Utf8(s: string) {
  return createHash("sha256").update(s).digest("hex");
}

export async function signEvent(
  signer: KmsSigner,
  input: {
    id: string;
    recordId: string;
    type: EventType;
    actor: string;
    payload: unknown;
    prevEventHash: string | null;
    createdAt: string;
    inputHash: string;
  },
) {
  const body = {
    id: input.id,
    record_id: input.recordId,
    type: input.type,
    actor: input.actor,
    payload: input.payload,
    prev_event_hash: input.prevEventHash,
    created_at: input.createdAt,
    input_hash: input.inputHash,
  };
  const outputHash = sha256Utf8(canonicalJson(body));
  const signature = await signer.signPayload({ ...body, output_hash: outputHash });
  return { outputHash, signature, body };
}

export function verifyEventChain(
  canonicalJsonText: string,
  events: Array<{
    inputHash: string;
    outputHash: string;
    prevEventHash: string | null;
    type: string;
  }>,
) {
  if (!events.length) return { ok: false, reason: "missing_events" };
  const genesis = sha256Utf8(canonicalJsonText);
  let prev: string | null = null;
  for (const ev of events) {
    const expectInput = prev ?? genesis;
    if (ev.inputHash !== expectInput) return { ok: false, reason: "broken_chain" };
    if ((ev.prevEventHash ?? null) !== prev) return { ok: false, reason: "broken_chain" };
    prev = ev.outputHash;
  }
  return { ok: true as const, tip: prev };
}
