import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

/**
 * AES-256-GCM at-rest encryption for sensitive case payloads.
 *
 * IMPORTANT — read this before assuming more than it claims:
 * this protects data sitting in Clawback's own store from a database
 * dump or disk snapshot. It does NOT, by itself, stop an application
 * operator with the decryption key and normal process access from
 * reading a case in plaintext while it's being handled — that property
 * requires the sensitive analysis to actually run inside the 0G Compute
 * TEE path (see packages/compute), not merely encrypted storage. The two
 * are complementary, not the same guarantee. See THREAT-MODEL.md.
 */

export interface EncryptedPayload {
  readonly iv: string; // hex
  readonly authTag: string; // hex
  readonly ciphertext: string; // hex
}

function loadKey(keyHex: string | undefined): Buffer {
  if (!keyHex) {
    throw new Error(
      "CLAWBACK_ENCRYPTION_KEY is not set. Generate one with: " +
        "node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\"",
    );
  }
  const key = Buffer.from(keyHex, "hex");
  if (key.length !== 32) {
    throw new Error("CLAWBACK_ENCRYPTION_KEY must be a 32-byte hex string (64 hex characters).");
  }
  return key;
}

export function encryptAtRest(plaintext: string, keyHex: string | undefined): EncryptedPayload {
  const key = loadKey(keyHex);
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return {
    iv: iv.toString("hex"),
    authTag: authTag.toString("hex"),
    ciphertext: ciphertext.toString("hex"),
  };
}

export function decryptAtRest(payload: EncryptedPayload, keyHex: string | undefined): string {
  const key = loadKey(keyHex);
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(payload.iv, "hex"));
  decipher.setAuthTag(Buffer.from(payload.authTag, "hex"));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(payload.ciphertext, "hex")),
    decipher.final(),
  ]);
  return plaintext.toString("utf8");
}
