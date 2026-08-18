import { describe, expect, it } from "vitest";
import type { SubscriptionCaseInput } from "@clawback/shared";
import { SandboxSubscriptionProvider } from "./sandboxProvider.js";

const baseInput: SubscriptionCaseInput = {
  merchantName: "Acme Streaming",
  accountIdentifierLast4: "4242",
  subscriptionDetails: "Premium plan, $19.99/month, billed on the 3rd.",
  desiredOutcome: "Cancel and refund this month's $19.99 charge, I never used it.",
  contactChannel: "sandbox",
  contactAddress: "sandbox@example.test",
};

describe("SandboxSubscriptionProvider", () => {
  it("always labels its output as sandbox, never live", async () => {
    const provider = new SandboxSubscriptionProvider();
    const result = await provider.sendAction({
      caseId: "case_1",
      input: baseInput,
      exactMessage: "Please cancel my subscription.",
    });
    expect(result.source).toBe("sandbox");
  });

  it("is deterministic for the same merchant + account pair", async () => {
    const provider = new SandboxSubscriptionProvider();
    const a = await provider.sendAction({
      caseId: "case_1",
      input: baseInput,
      exactMessage: "Please cancel my subscription.",
    });
    const b = await provider.sendAction({
      caseId: "case_2", // different case, same merchant/account
      input: baseInput,
      exactMessage: "A completely different message.",
    });
    expect(a.outcomeType).toBe(b.outcomeType);
    expect(a.claimedSavingsCents).toBe(b.claimedSavingsCents);
  });

  it("produces a different outcome distribution for a different account", async () => {
    const provider = new SandboxSubscriptionProvider();
    const results = await Promise.all(
      Array.from({ length: 25 }, (_, i) =>
        provider.sendAction({
          caseId: `case_${i}`,
          input: { ...baseInput, accountIdentifierLast4: String(1000 + i) },
          exactMessage: "Please cancel my subscription.",
        }),
      ),
    );
    const distinctOutcomes = new Set(results.map((r) => r.outcomeType));
    // With 25 varied accounts we should see more than one outcome type —
    // this is not an "always succeeds" rigged demo.
    expect(distinctOutcomes.size).toBeGreaterThan(1);
  });

  it("parses a dollar amount out of the case text when issuing a refund", async () => {
    const provider = new SandboxSubscriptionProvider();
    // Search for an account/merchant combination that lands in the refund
    // bucket so this assertion is meaningful.
    for (let i = 0; i < 200; i++) {
      const input = { ...baseInput, accountIdentifierLast4: String(2000 + i) };
      const result = await provider.sendAction({
        caseId: "case_x",
        input,
        exactMessage: "Please cancel my subscription.",
      });
      if (result.outcomeType === "refund_issued") {
        expect(result.claimedSavingsCents).toBe(1999);
        return;
      }
    }
    throw new Error("no refund_issued outcome found in 200 samples — check bucket thresholds");
  });
});
