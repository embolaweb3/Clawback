import { describe, expect, it } from "vitest";
import type { SubscriptionCaseInput } from "@clawback/shared";
import { ComputeClient } from "./computeClient.js";
import { loadComputeConfig } from "./config.js";

const input: SubscriptionCaseInput = {
  merchantName: "Acme Streaming",
  accountIdentifierLast4: "4242",
  subscriptionDetails: "Premium plan, $19.99/month.",
  desiredOutcome: "Cancel and refund this month's charge.",
  contactChannel: "sandbox",
  contactAddress: "sandbox@example.test",
};

describe("loadComputeConfig", () => {
  it("returns null when ZG_COMPUTE_PRIVATE_KEY is absent", () => {
    expect(loadComputeConfig({})).toBeNull();
  });

  it("returns a config with sensible defaults when a key is present", () => {
    const config = loadComputeConfig({ ZG_COMPUTE_PRIVATE_KEY: "0xabc" });
    expect(config).not.toBeNull();
    expect(config?.rpcUrl).toBe("https://evmrpc-testnet.0g.ai");
    expect(config?.preferredProviderAddress).toBeNull();
  });
});

describe("ComputeClient (unconfigured mode)", () => {
  it("reports isConfigured: false with no env vars", () => {
    const client = new ComputeClient({});
    expect(client.isConfigured).toBe(false);
  });

  it("produces an honest, unattested result via the local fallback", async () => {
    const client = new ComputeClient({});
    const result = await client.analyze(input);
    expect(result.teeAttested).toBe(false);
    expect(result.attestation).toBeNull();
    expect(result.providerAddress).toBeNull();
    expect(result.degradedReason).toMatch(/unconfigured/i);
    expect(result.message).toContain("Acme Streaming");
    expect(result.message).toContain("4242");
  });

  it("produces stable, verifiable commitments for the same input", async () => {
    const client = new ComputeClient({});
    const a = await client.analyze(input);
    const b = await client.analyze(input);
    expect(a.inputCommitment).toBe(b.inputCommitment);
    // Output commitment is also stable because the fallback template is
    // deterministic — not true once a real LLM is in the loop, which is
    // exactly why teeAttested must be checked rather than assumed.
    expect(a.outputCommitment).toBe(b.outputCommitment);
  });
});
