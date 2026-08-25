import { randomBytes } from "node:crypto";
import { beforeEach, describe, expect, it } from "vitest";
import type { SubscriptionCaseInput } from "@clawback/shared";
import { ComputeClient } from "@clawback/compute";
import { SandboxSubscriptionProvider } from "@clawback/providers";
import { LocalSettlementLedger } from "@clawback/payments";
import { InMemoryCaseStore } from "./store.js";
import { Orchestrator, ProposalMismatchError } from "./orchestrator.js";

const ENCRYPTION_KEY = randomBytes(32).toString("hex");

const BASE_INPUT: Omit<SubscriptionCaseInput, "accountIdentifierLast4"> = {
  merchantName: "Acme Streaming",
  subscriptionDetails: "Premium plan, $19.99/month.",
  desiredOutcome: "Cancel and refund this month's $19.99 charge.",
  contactChannel: "sandbox",
  contactAddress: "sandbox@example.test",
};

/** Searches for an account identifier the sandbox provider's deterministic
 *  bucketing maps to the given outcome type, rather than hand-picking one
 *  and hoping — the bucketing is a hash of (merchant, account), not
 *  something a test should assume without checking. */
async function findInputWithOutcome(
  outcomeType: "refund_issued" | "cancelled" | "declined" | "no_response",
): Promise<SubscriptionCaseInput> {
  const provider = new SandboxSubscriptionProvider();
  for (let i = 0; i < 500; i++) {
    const candidate: SubscriptionCaseInput = { ...BASE_INPUT, accountIdentifierLast4: String(1000 + i) };
    const probe = await provider.sendAction({ caseId: "probe", input: candidate, exactMessage: "probe" });
    if (probe.outcomeType === outcomeType) return candidate;
  }
  throw new Error(`No account found producing outcome "${outcomeType}" in 500 samples.`);
}

function buildOrchestrator() {
  const store = new InMemoryCaseStore();
  const compute = new ComputeClient({}); // unconfigured -> honest local fallback
  const provider = new SandboxSubscriptionProvider();
  const settlementLedger = new LocalSettlementLedger();
  const orchestrator = new Orchestrator({
    store,
    compute,
    provider,
    encryptionKey: ENCRYPTION_KEY,
    settlementLedger,
    storageClient: null,
    anchorClient: null,
  });
  return { orchestrator, store, settlementLedger };
}

describe("Orchestrator — full case lifecycle", () => {
  let ctx: ReturnType<typeof buildOrchestrator>;

  beforeEach(() => {
    ctx = buildOrchestrator();
  });

  it("walks a case from submission through a proposal awaiting approval", async () => {
    const input = await findInputWithOutcome("refund_issued");
    const summary = await ctx.orchestrator.submitCase("user_1", input);
    expect(summary.state).toBe("AWAITING_APPROVAL");
    expect(summary.proposal).not.toBeNull();
    expect(summary.proposal!.exactMessage).toContain("Acme Streaming");
    expect(summary.degradedReason).toMatch(/unconfigured/i);
  });

  it("refuses to execute before approval (build prompt §6)", async () => {
    const input = await findInputWithOutcome("refund_issued");
    const summary = await ctx.orchestrator.submitCase("user_1", input);
    await expect(
      ctx.orchestrator.approveAndExecute(summary.caseId, "user_1", "some-other-proposal-id"),
    ).rejects.toThrow(ProposalMismatchError);
  });

  it("enforces ownership — a different user cannot approve someone else's case", async () => {
    const input = await findInputWithOutcome("refund_issued");
    const summary = await ctx.orchestrator.submitCase("user_1", input);
    await expect(
      ctx.orchestrator.approveAndExecute(summary.caseId, "user_2", summary.proposal!.proposalId),
    ).rejects.toThrow(/[Nn]ot authorized/);
  });

  it("runs the full happy path to a verified receipt after approval", async () => {
    const input = await findInputWithOutcome("refund_issued");
    const submitted = await ctx.orchestrator.submitCase("user_1", input);
    const final = await ctx.orchestrator.approveAndExecute(
      submitted.caseId,
      "user_1",
      submitted.proposal!.proposalId,
    );

    expect(final.state).toBe("VERIFIED_SUCCESS");
    expect(final.outcome?.outcomeType).toBe("refund_issued");
    expect(final.outcome?.claimedSavingsCents).toBe(1999);
    expect(final.outcome?.verifiedSavingsCents).toBe(1999);
    expect(final.receipt).not.toBeNull();
    expect(final.receipt!.status).toBe("successful");
    expect(final.receipt!.environment).toBe("sandbox");
    expect(final.receipt!.execution.teeAttested).toBe(false); // unconfigured compute in this test

    const settlement = await ctx.settlementLedger.get(submitted.caseId);
    expect(settlement?.fee.feeCents).toBeGreaterThan(0);
    expect(settlement?.fee.verifiedSavingsCents).toBe(1999);
  });

  it("produces a receipt that passes independent verification", async () => {
    const input = await findInputWithOutcome("refund_issued");
    const submitted = await ctx.orchestrator.submitCase("user_1", input);
    await ctx.orchestrator.approveAndExecute(submitted.caseId, "user_1", submitted.proposal!.proposalId);

    const report = await ctx.orchestrator.verifyCaseReceipt(submitted.caseId, "user_1");
    expect(report.allCryptographicChecksPassed).toBe(true);
  });

  it("allows a user to reject a proposal instead of approving it", async () => {
    const input = await findInputWithOutcome("refund_issued");
    const submitted = await ctx.orchestrator.submitCase("user_1", input);
    const rejected = await ctx.orchestrator.rejectProposal(submitted.caseId, "user_1");
    expect(rejected.state).toBe("REJECTED");
    await expect(
      ctx.orchestrator.approveAndExecute(submitted.caseId, "user_1", submitted.proposal!.proposalId),
    ).rejects.toThrow(); // illegal transition — REJECTED is terminal
  });

  it("never assesses a fee when the outcome carries no savings (cancelled, no refund)", async () => {
    const input = await findInputWithOutcome("cancelled");
    const submitted = await ctx.orchestrator.submitCase("user_1", input);
    const final = await ctx.orchestrator.approveAndExecute(
      submitted.caseId,
      "user_1",
      submitted.proposal!.proposalId,
    );
    expect(final.outcome?.claimedSavingsCents).toBe(0);
    const settlement = await ctx.settlementLedger.get(submitted.caseId);
    expect(settlement?.fee.feeCents ?? 0).toBe(0);
  });

  it("records an EXECUTION_FAILED case honestly when the counterparty never responds", async () => {
    const input = await findInputWithOutcome("no_response");
    const submitted = await ctx.orchestrator.submitCase("user_1", input);
    const final = await ctx.orchestrator.approveAndExecute(
      submitted.caseId,
      "user_1",
      submitted.proposal!.proposalId,
    );
    expect(final.state).toBe("EXECUTION_FAILED");
    expect(final.receipt).toBeNull();
    const settlement = await ctx.settlementLedger.get(submitted.caseId);
    expect(settlement).toBeNull();
  });
});
