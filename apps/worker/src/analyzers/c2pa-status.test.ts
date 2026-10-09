import { describe, expect, it } from "vitest";
import { mapStore } from "./c2pa.js";
import { stateFromStatus } from "./c2pa-status.js";

describe("C2PA 2.3 status mapping (AN-25)", () => {
  it("maps missing active manifest to not_detected", () => {
    expect(stateFromStatus([], false)).toBe("not_detected");
  });

  it("maps trusted signature to verified_and_trusted", () => {
    expect(
      stateFromStatus(
        [{ code: "claimSignature.validated" }, { code: "signingCredential.trusted" }],
        true,
      ),
    ).toBe("verified_and_trusted");
  });

  it("maps valid untrusted signer to valid_signer_not_recognised", () => {
    expect(
      stateFromStatus(
        [{ code: "claimSignature.validated" }, { code: "signingCredential.untrusted" }],
        true,
      ),
    ).toBe("valid_signer_not_recognised");
  });

  it("maps dataHash mismatch to invalid", () => {
    expect(
      stateFromStatus(
        [{ code: "assertion.dataHash.mismatch" }, { code: "claimSignature.validated" }],
        true,
      ),
    ).toBe("invalid");
  });

  it("maps inaccessible manifest to unable_to_verify", () => {
    expect(stateFromStatus([{ code: "manifest.inaccessible" }], true)).toBe("unable_to_verify");
  });

  it("maps spec validation_state Trusted/Valid/Invalid", () => {
    expect(stateFromStatus([], true, "Trusted")).toBe("verified_and_trusted");
    expect(stateFromStatus([], true, "Valid")).toBe("valid_signer_not_recognised");
    expect(stateFromStatus([], true, "Invalid")).toBe("invalid");
  });

  it("extracts signer, generator, actions and digitalSourceType from a store", () => {
    const r = mapStore(
      {
        active_manifest: "urn:c2pa:test",
        manifests: {
          "urn:c2pa:test": {
            claim_generator: "test-app/1.0",
            signature_info: { issuer: "Test CA", time: "2026-01-02T03:04:05Z" },
            assertions: [
              {
                label: "c2pa.actions",
                data: {
                  actions: [{ action: "c2pa.created", digitalSourceType: "http://cv.iptc.org/newscodes/digitalsourcetype/trainedAlgorithmicMedia" }],
                },
              },
            ],
            ingredients: [{ title: "source.jpg" }],
          },
        },
        validation_status: [
          { code: "claimSignature.validated" },
          { code: "signingCredential.trusted" },
        ],
      },
      "c2pa-2.3-trust-test",
    );
    expect(r.state).toBe("verified_and_trusted");
    expect(r.signer).toBe("Test CA");
    expect(r.claim_generator).toBe("test-app/1.0");
    expect(r.signed_at).toBe("2026-01-02T03:04:05Z");
    expect(r.ai_assertion).toContain("trainedAlgorithmicMedia");
    expect(r.trust_list_version).toBe("c2pa-2.3-trust-test");
  });
});
