import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { decryptAtRest, encryptAtRest } from "./encryption.js";

const KEY = randomBytes(32).toString("hex");

describe("at-rest encryption", () => {
  it("round-trips plaintext", () => {
    const payload = encryptAtRest("Acme Corp, account ending 4242", KEY);
    expect(decryptAtRest(payload, KEY)).toBe("Acme Corp, account ending 4242");
  });

  it("never stores the plaintext anywhere in the payload", () => {
    const secret = "super-sensitive-account-number-9999";
    const payload = encryptAtRest(secret, KEY);
    const serialized = JSON.stringify(payload);
    expect(serialized).not.toContain(secret);
  });

  it("fails closed on a tampered auth tag rather than returning wrong plaintext", () => {
    const payload = encryptAtRest("hello", KEY);
    const tampered = { ...payload, authTag: randomBytes(16).toString("hex") };
    expect(() => decryptAtRest(tampered, KEY)).toThrow();
  });

  it("refuses to run without a configured key", () => {
    expect(() => encryptAtRest("x", undefined)).toThrow(/CLAWBACK_ENCRYPTION_KEY/);
  });

  it("refuses a malformed (wrong-length) key", () => {
    expect(() => encryptAtRest("x", "deadbeef")).toThrow(/32-byte/);
  });
});
