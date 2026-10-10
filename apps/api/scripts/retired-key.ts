// Prints the public half of the current env PEM as SIGNING_RETIRED_KEYS_JSON, for use when moving to KMS.
// SIGNING_PRIVATE_KEY_PEM=... SIGNING_KEY_ID=... SIGNING_KEY_VALID_FROM=... pnpm --filter @oyokometa/api signing:retired-key
import { retiredKeyFromPem, retiredKeys } from "../src/signing/kms.js";

const pem = process.env.SIGNING_PRIVATE_KEY_PEM?.replace(/\\n/g, "\n");
const kid = process.env.SIGNING_KEY_ID;
if (!pem || !kid) {
  console.error("Set SIGNING_PRIVATE_KEY_PEM and SIGNING_KEY_ID.");
  process.exit(1);
}
const validFrom = process.env.SIGNING_KEY_VALID_FROM ?? "2026-01-01T00:00:00.000Z";
const retired = [
  ...retiredKeys().filter((k) => k.kid !== kid),
  retiredKeyFromPem(pem, kid, validFrom, new Date().toISOString()),
];
console.log(JSON.stringify(retired));
