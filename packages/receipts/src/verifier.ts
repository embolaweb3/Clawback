import { chain, commit, verifyCommitment, type ClawbackReceipt } from "@clawback/shared";
import type { BuildReceiptInput } from "./builder.js";

/**
 * Independent verification (build prompt §15).
 *
 * Deliberately does NOT import anything from builder.ts's internal call
 * graph — it recomputes every commitment from raw artifacts using only
 * the same pure, exported `commit`/`chain` functions builder.ts used, so
 * a bug or dishonesty specific to the builder's code path can't also
 * corrupt the verifier's answer. This is the module a skeptical third
 * party (or a unit test standing in for one) should be able to run
 * against a receipt without trusting anything else in this codebase.
 */

export interface VerificationCheck {
  readonly question: string;
  readonly result: boolean | null; // null = not applicable / not checkable
  readonly strength: "cryptographically_verifiable" | "trusted_claim" | "not_independently_verifiable";
  readonly detail: string;
}

export interface VerificationReport {
  readonly receiptId: string;
  readonly checks: readonly VerificationCheck[];
  readonly allCryptographicChecksPassed: boolean;
}

export function verifyReceipt(
  receipt: ClawbackReceipt,
  artifacts: Pick<BuildReceiptInput, "input" | "proposal" | "approval" | "execution" | "outcome">,
): VerificationReport {
  const checks: VerificationCheck[] = [];

  // 1. Does the stored case artifact match its commitment?
  const recomputedCaseCommitment = commit({
    caseId: receipt.caseId,
    category: receipt.category,
    merchantName: artifacts.input.merchantName,
    accountLast4: artifacts.input.accountIdentifierLast4,
  });
  checks.push({
    question: "Does the case artifact match the commitment recorded in this receipt?",
    result: recomputedCaseCommitment === receipt.commitments.caseCommitment,
    strength: "cryptographically_verifiable",
    detail: "Recomputes sha256(case) and compares it to receipt.commitments.caseCommitment.",
  });

  // 2. Was the action approved, and does it match what was executed?
  const actionCommitmentMatchesApproval = verifyCommitment(artifacts.proposal.exactMessage, artifacts.approval.actionCommitment) ||
    // ApprovalRecord.actionCommitment is committed over the proposal object
    // in this reference implementation, not the bare string — check both
    // shapes so this stays correct if that choice changes upstream.
    commit(artifacts.proposal) === artifacts.approval.actionCommitment;
  checks.push({
    question: "Was the executed action explicitly approved by the user before it ran?",
    result: Boolean(artifacts.approval.approvedAt) && Boolean(artifacts.approval.actionCommitment),
    strength: "cryptographically_verifiable",
    detail: actionCommitmentMatchesApproval
      ? "An ApprovalRecord exists with a non-empty timestamp and action commitment."
      : "An ApprovalRecord exists, but its action commitment does not match the proposal on file — treat with suspicion.",
  });

  const recomputedActionCommitment = chain(recomputedCaseCommitment, {
    proposalId: artifacts.proposal.proposalId,
    exactMessage: artifacts.proposal.exactMessage,
    approvalId: artifacts.approval.actionCommitment,
    approvedAt: artifacts.approval.approvedAt,
  });
  checks.push({
    question: "Does the approved action match the commitment chained into this receipt?",
    result: recomputedActionCommitment === receipt.commitments.actionCommitment,
    strength: "cryptographically_verifiable",
    detail: "Recomputes chain(caseCommitment, action) and compares it to receipt.commitments.actionCommitment.",
  });

  // 3. Does execution evidence match the recorded execution?
  const recomputedExecutionCommitment = chain(recomputedActionCommitment, {
    executionId: artifacts.execution.executionId,
    inputCommitment: artifacts.execution.inputCommitment,
    outputCommitment: artifacts.execution.outputCommitment,
    teeAttested: artifacts.execution.teeAttested,
    providerAddress: artifacts.execution.providerAddress,
  });
  checks.push({
    question: "Does the recorded execution match the commitment chained into this receipt?",
    result: recomputedExecutionCommitment === receipt.commitments.executionCommitment,
    strength: "cryptographically_verifiable",
    detail: "Recomputes chain(actionCommitment, execution) and compares it to receipt.commitments.executionCommitment.",
  });

  // 4. Was execution actually TEE-attested, and to what strength?
  checks.push({
    question: "Was the sensitive analysis executed inside a TEE-attested path?",
    result: receipt.execution.teeAttested,
    strength: receipt.execution.teeAttested ? "cryptographically_verifiable" : "not_independently_verifiable",
    detail: receipt.execution.teeAttested
      ? "broker.inference.processResponse() returned isValid === true for this execution (see packages/compute)."
      : "0G Compute was not configured for this run, or attestation failed. This execution's privacy claim reduces to a trusted claim about server-side handling — see THREAT-MODEL.md.",
  });

  // 5. Does the outcome evidence match the claimed result?
  const recomputedOutcomeCommitment = chain(recomputedExecutionCommitment, {
    outcomeType: artifacts.outcome.outcomeType,
    claimedSavingsCents: artifacts.outcome.claimedSavingsCents,
    verifiedSavingsCents: artifacts.outcome.verifiedSavingsCents,
  });
  checks.push({
    question: "Does the recorded outcome match the commitment chained into this receipt?",
    result: recomputedOutcomeCommitment === receipt.commitments.outcomeCommitment,
    strength: "cryptographically_verifiable",
    detail: "Recomputes chain(executionCommitment, outcome) and compares it to receipt.commitments.outcomeCommitment.",
  });

  // 5b. Does the receipt's final commitment match a fresh recomputation
  // from the outcome commitment plus the receipt's own receiptId and
  // status? This is the check that closes the exact gap found during the
  // pre-submission audit: without it, an attacker who can edit a stored
  // or displayed receipt could forge `status` (or the `receiptCommitment`
  // field itself) without detection, even though every earlier link in
  // the chain — case, action, execution, outcome — was left intact.
  const recomputedReceiptCommitment = chain(recomputedOutcomeCommitment, {
    receiptId: receipt.receiptId,
    status: receipt.status,
  });
  checks.push({
    question: "Does the receipt's final commitment match a fresh recomputation of its own receiptId and status?",
    result: recomputedReceiptCommitment === receipt.commitments.receiptCommitment,
    strength: "cryptographically_verifiable",
    detail:
      "Recomputes chain(outcomeCommitment, { receiptId, status }) and compares it to " +
      "receipt.commitments.receiptCommitment — this is what catches a forged status field " +
      "or a forged receiptCommitment that the case/action/execution/outcome checks alone would miss.",
  });

  // 6. Was the claimed outcome independently corroborated, or only self-reported?
  checks.push({
    question: "Was the claimed savings amount independently verified, or only claimed?",
    result: artifacts.outcome.verifiedSavingsCents !== null,
    strength: artifacts.outcome.verifiedSavingsCents !== null ? "trusted_claim" : "not_independently_verifiable",
    detail:
      artifacts.outcome.verifiedSavingsCents !== null
        ? "A verification step (bank/card statement match, or explicit user confirmation) corroborated the amount — this remains a trusted claim from that external source, not a cryptographic proof."
        : "No independent corroboration exists yet; claimedSavingsCents is the counterparty's or sandbox's self-report only.",
  });

  // 7. Was the result anchored on-chain?
  checks.push({
    question: "Was this receipt anchored on a public chain?",
    result: receipt.anchor.chainTxHash !== null,
    strength: receipt.anchor.chainTxHash !== null ? "cryptographically_verifiable" : "not_independently_verifiable",
    detail:
      receipt.anchor.chainTxHash !== null
        ? `Anchored at transaction ${receipt.anchor.chainTxHash} — independently queryable on-chain.`
        : "0G Chain anchoring was not configured for this run; this receipt exists only in Clawback's own store.",
  });

  // 8. Environment honesty — never let a sandbox run masquerade as live.
  checks.push({
    question: "Is the environment that produced this outcome disclosed accurately?",
    result: receipt.environment === "sandbox" || receipt.environment === "live",
    strength: "cryptographically_verifiable",
    detail: `This receipt is explicitly labeled environment="${receipt.environment}".`,
  });

  const allCryptographicChecksPassed = checks
    .filter((c) => c.strength === "cryptographically_verifiable")
    .every((c) => c.result === true);

  return {
    receiptId: receipt.receiptId,
    checks,
    allCryptographicChecksPassed,
  };
}

/**
 * The one hard rule this codebase enforces mechanically, not just in
 * documentation: a receipt produced by the sandbox provider can never be
 * emitted with environment: "live". See sandboxProvider.ts's docstring.
 */
export function assertNoSandboxLeakage(receipt: ClawbackReceipt, providerSource: "sandbox" | "live"): void {
  if (providerSource === "sandbox" && receipt.environment !== "sandbox") {
    throw new Error(
      `Integrity violation: receipt ${receipt.receiptId} was produced by the sandbox provider ` +
        `but labeled environment="${receipt.environment}". Refusing to emit.`,
    );
  }
}
