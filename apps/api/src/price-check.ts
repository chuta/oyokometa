import type { Context } from "hono";
import { ERROR_CODES } from "@oyokometa/config";
import { apiError } from "@oyokometa/shared";

/** The client must echo the price it showed the user; charging anything else needs a fresh confirmation. */
export function priceConfirmed(expected: unknown, cost: number): boolean {
  return typeof expected === "number" && Number.isInteger(expected) && expected === cost;
}

export function priceChangedResponse(c: Context, cost: number, requestId: string) {
  return c.json(
    {
      ...apiError(
        ERROR_CODES.price_changed,
        `This action costs ${cost} credits. Confirm the price to continue.`,
        requestId,
      ),
      cost,
    },
    409,
  );
}
