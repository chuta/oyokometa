import {
  BachsRequestError,
  bachsCheckout,
  bachsProductId,
  bachsRequest,
  minorToDecimal,
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
    idempotencyKey: `oyokometa-product:${product.id}`,
  });
  const id = bachsProductId(created);
  if (!id) throw new BachsRequestError(200, "missing_product_id");
  return id;
}

export async function createBachsCheckout(input: {
  paymentId: string;
  bachsProductId: string;
  productId: string;
  email: string;
  credits: number;
  successUrl: string;
  cancelUrl: string;
}) {
  const created = await bachsRequest("/v1/checkout-sessions", {
    method: "POST",
    idempotencyKey: input.paymentId,
    body: {
      product_cart: [{ product_id: input.bachsProductId, quantity: 1 }],
      customer: { email: input.email },
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
