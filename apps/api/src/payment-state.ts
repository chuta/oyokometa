export type PaymentStatus =
  | "awaiting_transfer"
  | "awaiting_match"
  | "paid"
  | "rejected"
  | "reversed";

export type PaymentAction = "user_claim" | "admin_confirm" | "admin_reject" | "admin_reverse";

const TRANSITIONS: Record<PaymentAction, Partial<Record<string, PaymentStatus>>> = {
  user_claim: { awaiting_transfer: "awaiting_match" },
  admin_confirm: { awaiting_transfer: "paid", awaiting_match: "paid" },
  admin_reject: { awaiting_transfer: "rejected", awaiting_match: "rejected" },
  admin_reverse: { paid: "reversed" },
};

/** Credits are granted only by `admin_confirm` (CR-13); a user claim never grants. */
export function nextPaymentStatus(current: string, action: PaymentAction): PaymentStatus | null {
  return TRANSITIONS[action][current] ?? null;
}

export function grantsCredits(action: PaymentAction): boolean {
  return action === "admin_confirm";
}
