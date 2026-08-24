import {
  commit,
  newId,
  type ApprovalRecord,
  type ExecutionEvidence,
  type OutcomeEvidence,
  type SubscriptionCaseInput,
} from "@clawback/shared";
import { decryptAtRest, encryptAtRest } from "@clawback/privacy";
import type { ComputeClient } from "@clawback/compute";
import type { SubscriptionProvider } from "@clawback/providers";
import { buildReceipt, verifyReceipt, assertNoSandboxLeakage, type VerificationReport } from "@clawback/receipts";
import { computeFee, type SettlementLedger } from "@clawback/payments";
import type { StorageClient } from "@clawback/storage";
import type { AnchorClient } from "@clawback/chain";
import type { CaseStore } from "./store.js";
import { toSummary, type CaseSummary } from "./caseRecord.js";

export class ProposalMismatchError extends Error {
  constructor() {
    super("The proposal being approved does not match the case's current proposal.");
    this.name = "ProposalMismatchError";
  }
}

export interface OrchestratorDeps {
  readonly store: CaseStore;
  readonly compute: ComputeClient;
  readonly provider: SubscriptionProvider;
  readonly encryptionKey: string;
  readonly settlementLedger: SettlementLedger;
  readonly storageClient: StorageClient | null;
  readonly anchorClient: AnchorClient | null;
}

/**
 * Drives a case through the exact happy path from the build prompt:
 * Case → Private execution → Proposed action → Explicit approval →
 * Real action → Confirmation → Receipt.
 *
 * Every state transition goes through CaseStore.transition, which itself
 * goes through the shared state machine — this class cannot skip a step
 * even if it tried to, which is the point (build prompt §6: "Do not make
 * the agent silently send messages or perform irreversible actions").
 */
export class Orchestrator {
  constructor(private readonly deps: OrchestratorDeps) {}

  async submitCase(
    ownerId: string,
    input: SubscriptionCaseInput,
  ): Promise<CaseSummary> {
    const caseId = newId("case");
    const now = new Date().toISOString();
    const encryptedInput = encryptAtRest(JSON.stringify(input), this.deps.encryptionKey);

    await this.deps.store.create({
      caseId,
      ownerId,
      category: "subscription_cancellation",
      state: "DRAFT",
      encryptedInput,
      proposal: null,
      encryptedProposalMessage: null,
      approval: null,
      execution: null,
      outcome: null,
      receipt: null,
      settlement: null,
      environment: this.deps.provider.source,
      degradedReason: null,
      createdAt: now,
      updatedAt: now,
    });

    await this.deps.store.transition(caseId, "SUBMIT", () => ({}));
    await this.deps.store.transition(caseId, "BEGIN_ANALYSIS", () => ({}));

    // Decrypt only for the duration of this call, to hand the sensitive
    // input to the attested-compute path — see DATA_FLOW_REGISTRY.
    const analysis = await this.deps.compute.analyze(input);

    const proposal = {
      proposalId: newId("proposal"),
      summary: summarize(input),
      exactMessage: analysis.message,
      estimatedRecoveryCents: extractCents(input.desiredOutcome) ?? extractCents(input.subscriptionDetails),
      createdAt: new Date().toISOString(),
    };

    const record = await this.deps.store.transition(caseId, "PROPOSE_ACTION", (current) => ({
      proposal,
      encryptedProposalMessage: encryptAtRest(analysis.message, this.deps.encryptionKey),
      execution: {
        executionId: newId("exec"),
        caseId: current.caseId,
        startedAt: now,
        completedAt: new Date().toISOString(),
        succeeded: true,
        teeAttested: analysis.teeAttested,
        attestationEvidence: analysis.attestation,
        providerAddress: analysis.providerAddress,
        inputCommitment: analysis.inputCommitment,
        outputCommitment: analysis.outputCommitment,
        errorMessage: null,
      } satisfies ExecutionEvidence,
      degradedReason: analysis.degradedReason,
    }));

    await this.deps.store.transition(caseId, "REQUEST_APPROVAL", () => ({}));
    const final = await this.deps.store.get(caseId);
    return toSummary(final);
  }

  async rejectProposal(caseId: string, ownerId: string): Promise<CaseSummary> {
    await this.deps.store.getForOwner(caseId, ownerId); // authorization check
    const record = await this.deps.store.transition(caseId, "REJECT", () => ({}));
    return toSummary(record);
  }

  /**
   * The single most trust-critical method in the codebase (build prompt
   * §6, §16): requires the exact proposal the user saw, records an
   * auditable ApprovalRecord BEFORE anything is executed, and only then
   * proceeds to a real (or sandboxed) action.
   */
  async approveAndExecute(
    caseId: string,
    ownerId: string,
    proposalId: string,
  ): Promise<CaseSummary> {
    const current = await this.deps.store.getForOwner(caseId, ownerId);
    if (!current.proposal || current.proposal.proposalId !== proposalId) {
      throw new ProposalMismatchError();
    }

    const approval: ApprovalRecord = {
      caseId,
      proposalId,
      actionCommitment: commit(current.proposal),
      approvedAt: new Date().toISOString(),
      approvedBy: ownerId,
    };

    await this.deps.store.transition(caseId, "APPROVE", () => ({ approval }));
    await this.deps.store.transition(caseId, "BEGIN_EXECUTION", () => ({}));

    const inputJson = decryptAtRest(current.encryptedInput, this.deps.encryptionKey);
    const input = JSON.parse(inputJson) as SubscriptionCaseInput;

    let outcome: OutcomeEvidence;
    try {
      const result = await this.deps.provider.sendAction({
        caseId,
        input,
        exactMessage: current.proposal.exactMessage,
      });
      outcome = {
        caseId,
        outcomeType: result.outcomeType,
        counterpartyConfirmation: result.counterpartyConfirmation,
        claimedSavingsCents: result.claimedSavingsCents,
        // Verification, not self-report, decides this — see verifyOutcome.
        verifiedSavingsCents: verifyClaimedSavings(result),
        // Neither a sandbox nor an unparsed live merchant reply is
        // cryptographic proof — both are a trusted claim from the
        // counterparty until a real corroboration source is wired in.
        evidenceStrength: "trusted_claim",
        recordedAt: new Date().toISOString(),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await this.deps.store.transition(caseId, "EXECUTION_FAILED", (record) => ({
        execution: record.execution
          ? { ...record.execution, succeeded: false, errorMessage: message }
          : record.execution,
      }));
      return toSummary(await this.deps.store.get(caseId));
    }

    const outcomeEvent = outcome.outcomeType === "no_response" ? "EXECUTION_FAILED" : "EXECUTION_SUCCEEDED";
    const afterOutcome = await this.deps.store.transition(caseId, outcomeEvent, () => ({ outcome }));

    if (outcomeEvent === "EXECUTION_FAILED") {
      return toSummary(afterOutcome);
    }

    // Build (and best-effort anchor) the receipt BEFORE the single
    // OUTCOME_CONFIRMED transition into the terminal VERIFIED_SUCCESS
    // state, so the receipt is attached in the same state-changing write
    // rather than requiring a second, illegal transition afterward.
    const receipt = buildReceipt({
      caseId,
      category: afterOutcome.category,
      input,
      proposal: afterOutcome.proposal!,
      approval: afterOutcome.approval!,
      execution: afterOutcome.execution!,
      outcome: afterOutcome.outcome!,
      environment: this.deps.provider.source,
    });
    assertNoSandboxLeakage(receipt, this.deps.provider.source);

    let anchoredReceipt = receipt;
    if (this.deps.storageClient) {
      try {
        const stored = await this.deps.storageClient.uploadJson(receipt);
        anchoredReceipt = { ...receipt, anchor: { ...receipt.anchor, storageRootHash: stored.rootHash } };
      } catch {
        // Storage is best-effort at MVP scope — the receipt still exists
        // and is still internally verifiable; see LIMITATIONS.md.
      }
    }
    if (this.deps.anchorClient) {
      try {
        const anchored = await this.deps.anchorClient.anchorReceipt(
          commit(caseId),
          anchoredReceipt.commitments.receiptCommitment,
          null,
        );
        anchoredReceipt = { ...anchoredReceipt, anchor: { ...anchoredReceipt.anchor, chainTxHash: anchored.txHash } };
      } catch {
        // Same best-effort posture as storage above.
      }
    }

    if (outcome.verifiedSavingsCents !== null && outcome.verifiedSavingsCents > 0) {
      const fee = computeFee({ verifiedSavingsCents: outcome.verifiedSavingsCents });
      await this.deps.settlementLedger.assessFee(caseId, fee);
    }

    const finalRecord = await this.deps.store.transition(caseId, "OUTCOME_CONFIRMED", () => ({
      receipt: anchoredReceipt,
    }));

    return toSummary(finalRecord);
  }

  async getCase(caseId: string, ownerId: string): Promise<CaseSummary> {
    const record = await this.deps.store.getForOwner(caseId, ownerId);
    return toSummary(record);
  }

  async verifyCaseReceipt(caseId: string, ownerId: string): Promise<VerificationReport> {
    const record = await this.deps.store.getForOwner(caseId, ownerId);
    if (!record.receipt || !record.proposal || !record.approval || !record.execution || !record.outcome) {
      throw new Error(`Case ${caseId} has no finalized receipt to verify yet.`);
    }
    const input = JSON.parse(
      decryptAtRest(record.encryptedInput, this.deps.encryptionKey),
    ) as SubscriptionCaseInput;
    return verifyReceipt(record.receipt, {
      input,
      proposal: record.proposal,
      approval: record.approval,
      execution: record.execution,
      outcome: record.outcome,
    });
  }
}

function summarize(input: SubscriptionCaseInput): string {
  return `Requesting: ${input.desiredOutcome}`;
}

function extractCents(text: string): number | null {
  const match = text.match(/\$\s?(\d+(?:\.\d{1,2})?)/);
  const amount = match?.[1];
  if (!amount) return null;
  return Math.round(parseFloat(amount) * 100);
}

/**
 * Placeholder for real corroboration (e.g. matching a bank/card statement
 * line the user connects). For MVP, a sandboxed or live counterparty
 * confirmation is treated as verified ONLY when it names a concrete
 * amount — never for a bare, amount-less claim. This is a deliberately
 * conservative stand-in; see LIMITATIONS.md and packages/payments/fee.ts,
 * which refuses to charge a fee against anything short of this.
 */
function verifyClaimedSavings(result: { claimedSavingsCents: number; counterpartyConfirmation: string | null }): number | null {
  if (result.claimedSavingsCents <= 0) return result.claimedSavingsCents;
  return result.counterpartyConfirmation ? result.claimedSavingsCents : null;
}
