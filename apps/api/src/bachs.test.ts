import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  bachsApiBase,
  bachsCheckout,
  bachsProductId,
  chargedAmountCoversPack,
  classifyBachsEvent,
  decimalToMinor,
  isPublicReturnUrl,
  minorToDecimal,
  verifyBachsSignature,
} from "./bachs.js";

const secret = "whsec_test";
const rawBody = '{"id":"evt_1","type":"collection.succeeded"}';
const timestamp = "1700000000";
const signature = createHmac("sha256", secret).update(`${timestamp}.${rawBody}`, "utf8").digest("hex");

describe("Bachs money and URLs", () => {
  it("formats minor units as decimal strings", () => {
    expect(minorToDecimal(2900)).toBe("29.00");
    expect(minorToDecimal(500000)).toBe("5000.00");
    expect(minorToDecimal(5)).toBe("0.05");
    expect(decimalToMinor("29.00")).toBe(2900);
    expect(decimalToMinor("29")).toBeNull();
    expect(decimalToMinor("29.0")).toBeNull();
  });

  it("selects the API host from the key prefix", () => {
    expect(bachsApiBase("sk_sandbox_abc")).toBe("https://sandbox-api.bachs.io");
    expect(bachsApiBase("sk_live_abc")).toBe("https://api.bachs.io");
    expect(() => bachsApiBase("secret")).toThrow();
  });

  it("rejects localhost and private return URLs", () => {
    expect(isPublicReturnUrl("https://oyokometa.xyz/credits/pay/abc")).toBe(true);
    expect(isPublicReturnUrl("http://localhost:3000/credits")).toBe(false);
    expect(isPublicReturnUrl("http://127.0.0.1/credits")).toBe(false);
    expect(isPublicReturnUrl("https://10.1.1.1/credits")).toBe(false);
    expect(isPublicReturnUrl("https://192.168.0.8/credits")).toBe(false);
  });
});

describe("Bachs webhook signatures", () => {
  const now = 1_700_000_000;

  it("accepts a v2 signature and a second v1 during rotation", () => {
    expect(
      verifyBachsSignature({
        rawBody,
        secret,
        signatureV2: `t=${timestamp},v1=${signature}`,
        signatureV1: undefined,
        timestampV1: undefined,
        nowSeconds: now,
      }),
    ).toBe(true);
    expect(
      verifyBachsSignature({
        rawBody,
        secret,
        signatureV2: `t=${timestamp},v1=${"ab".repeat(32)},v1=${signature}`,
        signatureV1: undefined,
        timestampV1: undefined,
        nowSeconds: now,
      }),
    ).toBe(true);
  });

  it("rejects a stale timestamp, a bad signature, and a re-serialized body", () => {
    expect(
      verifyBachsSignature({
        rawBody,
        secret,
        signatureV2: `t=${timestamp},v1=${signature}`,
        signatureV1: undefined,
        timestampV1: undefined,
        nowSeconds: now + 301,
      }),
    ).toBe(false);
    expect(
      verifyBachsSignature({
        rawBody,
        secret,
        signatureV2: `t=${timestamp},v1=${"cd".repeat(32)}`,
        signatureV1: undefined,
        timestampV1: undefined,
        nowSeconds: now,
      }),
    ).toBe(false);
    expect(
      verifyBachsSignature({
        rawBody: `${rawBody} `,
        secret,
        signatureV2: `t=${timestamp},v1=${signature}`,
        signatureV1: undefined,
        timestampV1: undefined,
        nowSeconds: now,
      }),
    ).toBe(false);
  });
});

describe("Bachs fulfilment decisions", () => {
  const paymentId = "11111111-1111-4111-8111-111111111111";

  it("grants on collection.succeeded and ignores unpaid checkout events", () => {
    expect(
      classifyBachsEvent({
        type: "collection.succeeded",
        data: { reference: paymentId, checkout_id: "chk_1", charge_id: "ch_1", status: "SUCCEEDED", amount: "29.00", currency: "USD" },
      }).kind,
    ).toBe("grant");
    expect(classifyBachsEvent({ type: "checkout.completed", data: { reference: paymentId } }).kind).toBe("ignore");
    expect(classifyBachsEvent({ type: "collection.failed", data: { reference: paymentId } }).kind).toBe("ignore");
  });

  it("expires from the checkout reference", () => {
    const decision = classifyBachsEvent({ type: "checkout.expired", data: { reference: paymentId, checkout_id: "chk_1" } });
    expect(decision).toEqual({ kind: "expire", paymentId, checkoutId: "chk_1" });
  });

  it("reverses a paid refund or a lost dispute", () => {
    expect(classifyBachsEvent({ type: "refund.paid", data: { charge_id: "ch_1", reference: "refund_1" } })).toEqual({
      kind: "reverse",
      chargeId: "ch_1",
    });
    expect(classifyBachsEvent({ type: "dispute.lost", data: { charge_id: "ch_1" } })).toEqual({
      kind: "reverse",
      chargeId: "ch_1",
    });
    expect(classifyBachsEvent({ type: "dispute.updated", data: { charge_id: "ch_1", status: "lost" } })).toEqual({
      kind: "reverse",
      chargeId: "ch_1",
    });
    expect(classifyBachsEvent({ type: "dispute.updated", data: { charge_id: "ch_1", status: "won" } }).kind).toBe("ignore");
  });

  it("accepts the pack price in USD or NGN and any other collected currency", () => {
    expect(
      chargedAmountCoversPack({
        status: "SUCCEEDED",
        currency: "USD",
        amount: "29.00",
        expectedUsdMinor: 2900,
        expectedNgnMinor: 500000,
      }),
    ).toBe(true);
    expect(
      chargedAmountCoversPack({
        status: "SUCCEEDED",
        currency: "USD",
        amount: "28.00",
        expectedUsdMinor: 2900,
        expectedNgnMinor: 500000,
      }),
    ).toBe(false);
    expect(
      chargedAmountCoversPack({
        status: "SUCCEEDED",
        currency: "NGN",
        amount: "5000.00",
        expectedUsdMinor: 2900,
        expectedNgnMinor: 500000,
      }),
    ).toBe(true);
    expect(
      chargedAmountCoversPack({
        status: "OVERPAID",
        currency: "NGN",
        amount: "5100.00",
        expectedUsdMinor: 2900,
        expectedNgnMinor: 500000,
      }),
    ).toBe(true);
    expect(
      chargedAmountCoversPack({
        status: "SUCCEEDED",
        currency: "GHS",
        amount: "180.00",
        expectedUsdMinor: 2900,
        expectedNgnMinor: 500000,
      }),
    ).toBe(true);
    expect(
      chargedAmountCoversPack({
        status: "ACCEPTED",
        currency: "USD",
        amount: "29.00",
        expectedUsdMinor: 2900,
        expectedNgnMinor: 500000,
      }),
    ).toBe(false);
  });

  it("reads checkout and product ids from Bachs responses", () => {
    expect(bachsCheckout({ checkout_id: "chk_abc", checkout_url: "https://checkout.bachs.io/c/abc" })).toEqual({
      checkoutId: "chk_abc",
      checkoutUrl: "https://checkout.bachs.io/c/abc",
    });
    expect(bachsCheckout({ checkout_id: "chk_abc", checkout_url: "http://localhost/c" })).toBeNull();
    expect(bachsProductId({ product_id: "prod_abc" })).toBe("prod_abc");
    expect(bachsProductId({ id: "not-a-product" })).toBeNull();
  });
});
