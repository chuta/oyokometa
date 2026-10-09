import { describe, expect, it } from "vitest";
import { hashPassword, isValidPassword, isValidUsername, verifyPassword } from "./password.js";

describe("passwords", () => {
  it("accepts usernames and rejects short passwords", () => {
    expect(isValidUsername("chuta")).toBe(true);
    expect(isValidUsername("Chuta_01")).toBe(true);
    expect(isValidUsername("1bad")).toBe(false);
    expect(isValidUsername("ab")).toBe(false);
    expect(isValidPassword("short")).toBe(false);
    expect(isValidPassword("longenough1")).toBe(true);
  });

  it("round-trips scrypt hashes", async () => {
    const stored = await hashPassword("correct-horse");
    expect(await verifyPassword("correct-horse", stored)).toBe(true);
    expect(await verifyPassword("wrong-horse!!", stored)).toBe(false);
  });
});
