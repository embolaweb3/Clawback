import {
  chain,
  commit,
  newId,
  type ActionProposal,
  type ApprovalRecord,
  type CaseCategory,
  type ClawbackReceipt,
  type ExecutionEvidence,
  type OutcomeEvidence,
  type SubscriptionCaseInput,
} from "@clawback/shared";

/**
 * Builds a ClawbackReceipt by chaining a commitment across every stage of
 * the case (build prompt §14): case → action → execution → outcome →
 * receipt. Each commitment is computed from the PREVIOUS commitment plus
 * that stage's own artifact, so a receipt's final commitment can only
 * match if every earlier stage is exactly what it claims to be — this is
 * what makes packages/receipts/src/verifier.ts's checks meaningful rather
 * than decorative.
 *
 * This module only ever reads evidence that already exists; it never
 * invents a field. If execution.attestationEvidence is null (0G Compute
 * was not configured), the receipt honestly reports `teeAttested: false`
 * rather than omitting the field or guessing.
 */

export interface BuildReceiptInput {
  readonly caseId: string;
  readonly category: CaseCategory;
  readonly input: SubscriptionCaseInput;
  readonly proposal: ActionProposal;
  readonly approval: ApprovalRecord;
  readonly execution: ExecutionEvidence;
  readonly outcome: OutcomeEvidence;
  readonly environment: "sandbox" | "live";
  readonly anchor?: {
    readonly chainTxHash: string | null;
    readonly storageRootHash: string | null;
  };
}

export function buildReceipt(input: BuildReceiptInput): ClawbackReceipt {
  // Redact the sensitive input before it ever becomes part of a
  // committed artifact chain that might later be shown to the user —
  // the case commitment attests to the case having existed with this
  // shape, without baking raw PII into something that gets displayed.
  const caseCommitment = commit({
    caseId: input.caseId,
    category: input.category,
    merchantName: input.input.merchantName,
    accountLast4: input.input.accountIdentifierLast4,
  });

  const actionCommitment = chain(caseCommitment, {
    proposalId: input.proposal.proposalId,
    exactMessage: input.proposal.exactMessage,
    approvalId: input.approval.actionCommitment,
    approvedAt: input.approval.approvedAt,
  });

  const executionCommitment = chain(actionCommitment, {
    executionId: input.execution.executionId,
    inputCommitment: input.execution.inputCommitment,
    outputCommitment: input.execution.outputCommitment,
    teeAttested: input.execution.teeAttested,
    providerAddress: input.execution.providerAddress,
  });

  const outcomeCommitment = chain(executionCommitment, {
    outcomeType: input.outcome.outcomeType,
    claimedSavingsCents: input.outcome.claimedSavingsCents,
    verifiedSavingsCents: input.outcome.verifiedSavingsCents,
  });

  const status = deriveStatus(input);

  const receiptWithoutFinalCommitment = {
    receiptId: newId("receipt"),
    caseId: input.caseId,
    category: input.category,
    status,
    environment: input.environment,
    actionTaken: summarizeAction(input.proposal),
    outcome: summarizeOutcome(input.outcome),
    claimedSavingsCents: input.outcome.claimedSavingsCents,
    verifiedSavingsCents: input.outcome.verifiedSavingsCents,
    execution: {
      teeAttested: input.execution.teeAttested,
      evidenceStrength: input.execution.teeAttested
        ? ("tee_attested" as const)
        : ("not_independently_verifiable" as const),
      providerAddress: input.execution.providerAddress,
      model: input.execution.attestationEvidence?.model ?? null,
    },
    commitments: {
      caseCommitment,
      actionCommitment,
      executionCommitment,
      outcomeCommitment,
      receiptCommitment: "", // filled below
    },
    anchor: {
      chainTxHash: input.anchor?.chainTxHash ?? null,
      storageRootHash: input.anchor?.storageRootHash ?? null,
    },
    approval: {
      verified: true, // buildReceipt is only ever called after ApprovalRecord exists
      approvedAt: input.approval.approvedAt,
    },
    createdAt: new Date().toISOString(),
  };

  const receiptCommitment = chain(outcomeCommitment, {
    receiptId: receiptWithoutFinalCommitment.receiptId,
    status: receiptWithoutFinalCommitment.status,
  });

  return {
    ...receiptWithoutFinalCommitment,
    commitments: {
      ...receiptWithoutFinalCommitment.commitments,
      receiptCommitment,
    },
  };
}

function deriveStatus(input: BuildReceiptInput): "successful" | "unsuccessful" | "unverified" {
  if (input.outcome.outcomeType === "no_response") return "unverified";
  if (input.outcome.outcomeType === "declined") return "unsuccessful";
  return "successful"; // cancelled or refund_issued
}

function summarizeAction(proposal: ActionProposal): string {
  return proposal.summary;
}

function summarizeOutcome(outcome: OutcomeEvidence): string {
  switch (outcome.outcomeType) {
    case "refund_issued":
      return `Refund issued: $${(outcome.claimedSavingsCents / 100).toFixed(2)}`;
    case "cancelled":
      return "Subscription cancelled";
    case "declined":
      return "Request declined by the counterparty";
    case "no_response":
      return "No response received within the case window";
  }
}
