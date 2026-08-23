import { describe, expect, it } from "vitest";
import { buildReceipt } from "./builder.js";
import { makeFixture } from "./testFixtures.js";

describe("buildReceipt", () => {
  it("produces a receipt with all five chained commitments populated", () => {
    const receipt = buildReceipt(makeFixture());
    expect(receipt.commitments.caseCommitment).toMatch(/^0x[0-9a-f]{64}$/);
    expect(receipt.commitments.actionCommitment).toMatch(/^0x[0-9a-f]{64}$/);
    expect(receipt.commitments.executionCommitment).toMatch(/^0x[0-9a-f]{64}$/);
    expect(receipt.commitments.outcomeCommitment).toMatch(/^0x[0-9a-f]{64}$/);
    expect(receipt.commitments.receiptCommitment).toMatch(/^0x[0-9a-f]{64}$/);
  });

  it("marks status successful for a refund outcome", () => {
    const receipt = buildReceipt(makeFixture());
    expect(receipt.status).toBe("successful");
  });

  it("marks status unsuccessful for a declined outcome", () => {
    const receipt = buildReceipt(
      makeFixture({
        outcome: {
          caseId: "case_x",
          outcomeType: "declined",
          counterpartyConfirmation: "declined",
          claimedSavingsCents: 0,
          verifiedSavingsCents: 0,
          evidenceStrength: "trusted_claim",
          recordedAt: new Date().toISOString(),
        },
      }),
    );
    expect(receipt.status).toBe("unsuccessful");
  });

  it("marks status unverified for a no_response outcome", () => {
    const receipt = buildReceipt(
      makeFixture({
        outcome: {
          caseId: "case_x",
          outcomeType: "no_response",
          counterpartyConfirmation: null,
          claimedSavingsCents: 0,
          verifiedSavingsCents: null,
          evidenceStrength: "not_independently_verifiable",
          recordedAt: new Date().toISOString(),
        },
      }),
    );
    expect(receipt.status).toBe("unverified");
  });

  it("honestly reports teeAttested: false when execution wasn't attested", () => {
    const fixture = makeFixture();
    const receipt = buildReceipt({
      ...fixture,
      execution: { ...fixture.execution, teeAttested: false, attestationEvidence: null },
    });
    expect(receipt.execution.teeAttested).toBe(false);
    expect(receipt.execution.evidenceStrength).toBe("not_independently_verifiable");
  });

  it("carries the environment label through unmodified", () => {
    const receipt = buildReceipt(makeFixture({ environment: "sandbox" }));
    expect(receipt.environment).toBe("sandbox");
  });

  it("never includes raw sensitive fields in the receipt object", () => {
    const receipt = buildReceipt(makeFixture());
    const serialized = JSON.stringify(receipt);
    expect(serialized).not.toContain("Acme Streaming");
    expect(serialized).not.toContain("sandbox@example.test");
  });
});
