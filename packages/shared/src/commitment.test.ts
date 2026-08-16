import { describe, expect, it } from "vitest";
import { chain, commit, verifyCommitment } from "./commitment.js";

describe("commitments", () => {
  it("is deterministic regardless of key order", () => {
    const a = commit({ x: 1, y: 2 });
    const b = commit({ y: 2, x: 1 });
    expect(a).toBe(b);
  });

  it("changes when any field changes", () => {
    const a = commit({ amountCents: 500 });
    const b = commit({ amountCents: 501 });
    expect(a).not.toBe(b);
  });

  it("verifies correctly and detects tampering", () => {
    const artifact = { merchant: "Acme", amountCents: 1999 };
    const c = commit(artifact);
    expect(verifyCommitment(artifact, c)).toBe(true);
    expect(verifyCommitment({ merchant: "Acme", amountCents: 2000 }, c)).toBe(false);
  });

  it("produces 0x-prefixed 32-byte hex digests", () => {
    const c = commit({ anything: true });
    expect(c).toMatch(/^0x[0-9a-f]{64}$/);
  });

  it("chains so that an earlier substitution breaks every later commitment", () => {
    const caseCommitment = commit({ merchant: "Acme" });
    const actionCommitment = chain(caseCommitment, { message: "Please cancel my plan." });
    const executionCommitment = chain(actionCommitment, { output: "ok" });

    // Simulate someone tampering with the case after the fact.
    const tamperedCaseCommitment = commit({ merchant: "Acme Corp" });
    const recomputedActionCommitment = chain(tamperedCaseCommitment, {
      message: "Please cancel my plan.",
    });

    expect(recomputedActionCommitment).not.toBe(actionCommitment);
    // and therefore anything chained on top would also fail to match:
    expect(chain(recomputedActionCommitment, { output: "ok" })).not.toBe(executionCommitment);
  });
});
