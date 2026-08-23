import { commit, newId } from "@clawback/shared";
import type { BuildReceiptInput } from "./builder.js";

/** Shared, realistic fixture used across builder.test.ts and
 *  verifier.test.ts so both exercise the exact same artifact shapes a
 *  real case would produce. */
export function makeFixture(overrides: Partial<BuildReceiptInput> = {}): BuildReceiptInput {
  const caseId = newId("case");
  const proposal = {
    proposalId: newId("proposal"),
    summary: "Request a refund for this month's unused subscription and cancel future billing.",
    exactMessage:
      "Hello, I'd like to cancel my subscription and request a refund for the current billing period, which I did not use. Account ending 4242.",
    estimatedRecoveryCents: 1999,
    createdAt: new Date().toISOString(),
  };
  const approval = {
    caseId,
    proposalId: proposal.proposalId,
    actionCommitment: commit(proposal),
    approvedAt: new Date().toISOString(),
    approvedBy: "user_test_1",
  };
  const execution = {
    executionId: newId("exec"),
    caseId,
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    succeeded: true,
    teeAttested: true,
    attestationEvidence: {
      providerAddress: "0xProvider",
      model: "test-model",
      chatId: "chat_123",
      isValid: true,
      verifiedAt: new Date().toISOString(),
    },
    providerAddress: "0xProvider",
    inputCommitment: commit({ merchantName: "Acme Streaming" }),
    outputCommitment: commit({ output: "ok" }),
    errorMessage: null,
  };
  const outcome = {
    caseId,
    outcomeType: "refund_issued" as const,
    counterpartyConfirmation: "Sandbox confirmation: refund approved.",
    claimedSavingsCents: 1999,
    verifiedSavingsCents: 1999,
    evidenceStrength: "trusted_claim" as const,
    recordedAt: new Date().toISOString(),
  };

  return {
    caseId,
    category: "subscription_cancellation",
    input: {
      merchantName: "Acme Streaming",
      accountIdentifierLast4: "4242",
      subscriptionDetails: "Premium plan, $19.99/month.",
      desiredOutcome: "Cancel and refund this month's charge.",
      contactChannel: "sandbox",
      contactAddress: "sandbox@example.test",
    },
    proposal,
    approval,
    execution,
    outcome,
    environment: "sandbox",
    ...overrides,
  };
}
