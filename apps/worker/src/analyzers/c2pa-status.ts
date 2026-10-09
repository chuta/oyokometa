import type { C2paState } from "@oyokometa/evidence";

/** C2PA 2.3 §15.2 failure codes that mean a present manifest did not validate. */
export const BINDING_OR_SIGNATURE_FAILURE = [
  "assertion.dataHash.mismatch",
  "assertion.bmffHash.mismatch",
  "assertion.boxesHash.mismatch",
  "assertion.collectionHash.mismatch",
  "assertion.multiAssetHash.mismatch",
  "assertion.hashedURI.mismatch",
  "assertion.hardBinding.redacted",
  "assertion.dataHash.malformed",
  "assertion.bmffHash.malformed",
  "assertion.boxesHash.malformed",
  "assertion.missing",
  "claimSignature.mismatch",
  "claimSignature.missing",
  "claimSignature.outsideValidity",
  "claim.cbor.invalid",
  "claim.malformed",
  "claim.missing",
  "claim.multiple",
  "claim.hardBindings.missing",
  "hashedURI.mismatch",
  "hashedURI.missing",
  "signingCredential.invalid",
  "signingCredential.ocsp.revoked",
  "manifest.compressed.invalid",
  "algorithm.unsupported",
] as const;

export type StatusEntry = { code?: string; success?: boolean; explanation?: string };

export function codesOf(status: StatusEntry[] | undefined): string[] {
  return (status ?? []).map((s) => s.code).filter((c): c is string => Boolean(c));
}

/**
 * Map C2PA 2.3 validation states and status codes onto the five product states (AN-25).
 * Spec `Trusted` / `Valid` / `Invalid` are the three validator outcomes; we split Valid
 * as “signer not on the Trust List” and keep `unable_to_verify` for inconclusive SDK errors.
 */
export function stateFromStatus(
  status: StatusEntry[] | undefined,
  hasActiveManifest: boolean,
  validationState?: string | null,
): C2paState {
  if (!hasActiveManifest) return "not_detected";
  if (validationState === "Trusted") return "verified_and_trusted";
  if (validationState === "Valid") return "valid_signer_not_recognised";
  if (validationState === "Invalid") return "invalid";
  const codes = codesOf(status);
  if (codes.some((c) => (BINDING_OR_SIGNATURE_FAILURE as readonly string[]).includes(c))) {
    return "invalid";
  }
  const trusted = codes.includes("signingCredential.trusted");
  const untrusted = codes.includes("signingCredential.untrusted");
  const signed = codes.includes("claimSignature.validated");
  if (signed && trusted) return "verified_and_trusted";
  if (signed && untrusted) return "valid_signer_not_recognised";
  if (signed) return "valid_signer_not_recognised";
  if (untrusted) return "valid_signer_not_recognised";
  if (codes.some((c) => c.startsWith("general.error") || c.includes("inaccessible"))) {
    return "unable_to_verify";
  }
  return "unable_to_verify";
}

export function failureFromStatus(status: StatusEntry[] | undefined, state: C2paState): string | null {
  if (state === "not_detected" || state === "verified_and_trusted") return null;
  const fail = (status ?? []).find((s) => s.code && s.success === false);
  if (fail?.code) return fail.explanation ? `${fail.code}: ${fail.explanation}` : fail.code;
  const codes = codesOf(status);
  const interesting = codes.find(
    (c) =>
      (BINDING_OR_SIGNATURE_FAILURE as readonly string[]).includes(c) ||
      c === "signingCredential.untrusted" ||
      c.includes("error"),
  );
  return interesting ?? (state === "unable_to_verify" ? "validator did not return a conclusive status" : null);
}
