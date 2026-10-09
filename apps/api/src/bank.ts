import { eq } from "drizzle-orm";
import { randomBytes } from "node:crypto";
import { getDb, config } from "@oyokometa/db";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateTransferReference() {
  const bytes = randomBytes(8);
  let out = "OKM-";
  for (const b of bytes) out += ALPHABET[b % ALPHABET.length];
  return out;
}

export type BankDetails = {
  bank_name: string;
  account_name: string;
  account_number: string;
  currency: string;
};

export async function bankDetails(): Promise<BankDetails> {
  const fromEnv: BankDetails = {
    bank_name: process.env.BANK_NAME ?? "",
    account_name: process.env.BANK_ACCOUNT_NAME ?? "",
    account_number: process.env.BANK_ACCOUNT_NUMBER ?? "",
    currency: process.env.BANK_CURRENCY ?? "NGN",
  };
  if (fromEnv.bank_name && fromEnv.account_number) return fromEnv;
  const db = getDb();
  const [row] = await db.select().from(config).where(eq(config.key, "bank_transfer")).limit(1);
  const v = (row?.value ?? {}) as Partial<BankDetails>;
  return {
    bank_name: fromEnv.bank_name || v.bank_name || "",
    account_name: fromEnv.account_name || v.account_name || "",
    account_number: fromEnv.account_number || v.account_number || "",
    currency: fromEnv.currency || v.currency || "NGN",
  };
}

export function formatAmount(minor: number, currency: string) {
  const major = minor / 100;
  return `${currency} ${major.toLocaleString("en-NG", { minimumFractionDigits: 2 })}`;
}
