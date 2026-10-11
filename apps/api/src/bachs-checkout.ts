import { createHash } from "node:crypto";
import {
  BachsRequestError,
  bachsCheckout,
  bachsCustomerCreateBody,
  bachsCustomerId,
  bachsCustomerIdFromList,
  bachsCustomerPatchBody,
  bachsIdempotencyKey,
  bachsProductId,
  bachsRequest,
  checkoutCustomer,
  minorToDecimal,
  type BachsCustomerFields,
} from "./bachs.js";

type Pack = {
  id: string;
  name: string;
  credits: number;
  currency: string;
  priceMinor: number;
  usdPriceMinor: number;
  bachsProductId: string | null;
};

export async function syncBachsProduct(product: Pack): Promise<string> {
  const body = {
    name: `${product.name} (${product.credits} credits)`,
    price: priceFor(product),
  };
  if (product.bachsProductId) {
    try {
      await bachsRequest(`/v1/products/${product.bachsProductId}`, { method: "PATCH", body });
      return product.bachsProductId;
    } catch (err) {
      if (!(err instanceof BachsRequestError) || err.status !== 404) throw err;
    }
  }
  const created = await bachsRequest("/v1/products", {
    method: "POST",
    body,
    idempotencyKey: bachsIdempotencyKey("product", product.id),
  });
  const id = bachsProductId(created);
  if (!id) throw new BachsRequestError(200, "missing_product_id");
  return id;
}

export async function syncBachsCustomer(input: BachsCustomerFields & { customerId: string | null }): Promise<string> {
  const patch = bachsCustomerPatchBody(input);
  const idempotencyKey = `oyokometa-customer:${createHash("sha256").update(JSON.stringify(patch)).digest("hex")}`;
  if (input.customerId) {
    try {
      await bachsRequest(`/v1/customers/${input.customerId}`, { method: "PATCH", body: patch, idempotencyKey });
      return input.customerId;
    } catch (err) {
      if (!(err instanceof BachsRequestError) || err.status !== 404) throw err;
    }
  }
  let customerId: string | null = null;
  try {
    const created = await bachsRequest("/v1/customers", {
      method: "POST",
      body: bachsCustomerCreateBody(input),
      idempotencyKey: bachsIdempotencyKey("customer", input.userId),
    });
    customerId = bachsCustomerId(created);
  } catch (err) {
    if (!(err instanceof BachsRequestError) || err.status !== 409) throw err;
    const listed = await bachsRequest(`/v1/customers?search=${encodeURIComponent(input.email)}`, { method: "GET" });
    customerId = bachsCustomerIdFromList(listed, input.email);
  }
  if (!customerId) throw new BachsRequestError(200, "missing_customer_id");
  await bachsRequest(`/v1/customers/${customerId}`, { method: "PATCH", body: patch, idempotencyKey });
  return customerId;
}

export async function createBachsCheckout(input: {
  paymentId: string;
  bachsProductId: string;
  productId: string;
  email: string;
  name: string | null;
  phone: string | null;
  customerId: string | null;
  credits: number;
  successUrl: string;
  cancelUrl: string;
}) {
  const created = await bachsRequest("/v1/checkout-sessions", {
    method: "POST",
    idempotencyKey: input.paymentId,
    body: {
      product_cart: [{ product_id: input.bachsProductId, quantity: 1 }],
      customer: checkoutCustomer(input),
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
      reference: input.paymentId,
      metadata: {
        payment_id: input.paymentId,
        product_id: input.productId,
        credits: String(input.credits),
      },
      expires_in_minutes: 60,
    },
  });
  const checkout = bachsCheckout(created);
  if (!checkout) throw new BachsRequestError(200, "missing_checkout");
  return checkout;
}

function priceFor(product: Pack) {
  const price: {
    price_type: "fixed";
    amount: string;
    currency: "USD";
    currency_options?: Array<{ currency: string; amount: string }>;
  } = {
    price_type: "fixed",
    amount: minorToDecimal(product.usdPriceMinor),
    currency: "USD",
  };
  if (product.currency === "NGN") {
    price.currency_options = [{ currency: "NGN", amount: minorToDecimal(product.priceMinor) }];
  }
  return price;
}
