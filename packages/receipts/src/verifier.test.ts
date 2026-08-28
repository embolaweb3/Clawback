import { describe, expect, it } from "vitest";
import { buildReceipt } from "./builder.js";
import { makeFixture } from "./testFixtures.js";
import { assertNoSandboxLeakage, verifyReceipt } from "./verifier.js";

describe("verifyReceipt", () => {
  it("passes every cryptographic check against an untampered receipt", () => {
    const fixture = makeFixture();
    const receipt = buildReceipt(fixture);
    const report = verifyReceipt(receipt, fixture);
    expect(report.allCryptographicChecksPassed).toBe(true);
    for (const check of report.checks.filter((c) => c.strength === "cryptographically_verifiable")) {
      expect(check.result, check.question).toBe(true);
    }
  });

  it("detects a tampered execution artifact (build prompt §17: tampered artifact detection)", () => {
    const fixture = makeFixture();
    const receipt = buildReceipt(fixture);
    const tamperedFixture = {
      ...fixture,
      execution: { ...fixture.execution, providerAddress: "0xSomeoneElse" },
    };
    const report = verifyReceipt(receipt, tamperedFixture);
    expect(report.allCryptographicChecksPassed).toBe(false);
    const executionCheck = report.checks.find((c) =>
      c.question.includes("recorded execution match"),
    );
    expect(executionCheck?.result).toBe(false);
  });

  it("detects a tampered outcome (e.g. claimed savings inflated after the fact)", () => {
    const fixture = makeFixture();
    const receipt = buildReceipt(fixture);
    const tamperedFixture = {
      ...fixture,
      outcome: { ...fixture.outcome, claimedSavingsCents: 99_999 },
    };
    const report = verifyReceipt(receipt, tamperedFixture);
    const outcomeCheck = report.checks.find((c) => c.question.includes("recorded outcome match"));
    expect(outcomeCheck?.result).toBe(false);
    expect(report.allCryptographicChecksPassed).toBe(false);
  });

  it("detects a forged receiptCommitment even when every earlier link in the chain is intact (audit regression)", () => {
    const fixture = makeFixture();
    const receipt = buildReceipt(fixture);
    const forgedReceipt = {
      ...receipt,
      commitments: { ...receipt.commitments, receiptCommitment: "0x" + "f".repeat(64) },
    };

    const report = verifyReceipt(forgedReceipt, fixture);

    const finalCommitmentCheck = report.checks.find((c) =>
      c.question.includes("fresh recomputation of its own receiptId and status"),
    );
    expect(finalCommitmentCheck?.result).toBe(false);
    expect(report.allCryptographicChecksPassed).toBe(false);
  });

  it("detects a forged status left alongside the original (now-stale) receiptCommitment (audit regression)", () => {
    const fixture = makeFixture(); // successful outcome by default
    const receipt = buildReceipt(fixture);
    expect(receipt.status).toBe("successful");

    // The attack: flip the human-facing status without recomputing the
    // commitment that's supposed to cover it.
    const forgedReceipt = { ...receipt, status: "unsuccessful" as const };

    const report = verifyReceipt(forgedReceipt, fixture);

    const finalCommitmentCheck = report.checks.find((c) =>
      c.question.includes("fresh recomputation of its own receiptId and status"),
    );
    expect(finalCommitmentCheck?.result).toBe(false);
    expect(report.allCryptographicChecksPassed).toBe(false);
  });

  it("labels a non-attested execution as not_independently_verifiable, never as verified", () => {
    const fixture = makeFixture();
    const unattested = {
      ...fixture,
      execution: { ...fixture.execution, teeAttested: false, attestationEvidence: null },
    };
    const receipt = buildReceipt(unattested);
    const report = verifyReceipt(receipt, unattested);
    const attestationCheck = report.checks.find((c) => c.question.includes("TEE-attested"));
    expect(attestationCheck?.result).toBe(false);
    expect(attestationCheck?.strength).toBe("not_independently_verifiable");
  });

  it("labels an unverified savings claim honestly rather than upgrading it", () => {
    const fixture = makeFixture();
    const unverified = {
      ...fixture,
      outcome: { ...fixture.outcome, verifiedSavingsCents: null },
    };
    const receipt = buildReceipt(unverified);
    const report = verifyReceipt(receipt, unverified);
    const savingsCheck = report.checks.find((c) => c.question.includes("independently verified"));
    expect(savingsCheck?.result).toBe(false);
    expect(savingsCheck?.strength).toBe("not_independently_verifiable");
  });

  it("reports no chain anchor honestly when none was configured", () => {
    const fixture = makeFixture();
    const receipt = buildReceipt(fixture); // no anchor supplied
    const report = verifyReceipt(receipt, fixture);
    const anchorCheck = report.checks.find((c) => c.question.includes("anchored on a public chain"));
    expect(anchorCheck?.result).toBe(false);
    expect(receipt.anchor.chainTxHash).toBeNull();
  });
});

describe("assertNoSandboxLeakage", () => {
  it("allows a sandbox-sourced receipt correctly labeled sandbox", () => {
    const receipt = buildReceipt(makeFixture({ environment: "sandbox" }));
    expect(() => assertNoSandboxLeakage(receipt, "sandbox")).not.toThrow();
  });

  it("throws if a sandbox-sourced result is ever mislabeled as live", () => {
    const receipt = buildReceipt(makeFixture({ environment: "live" }));
    expect(() => assertNoSandboxLeakage(receipt, "sandbox")).toThrow(/Integrity violation/);
  });
});
