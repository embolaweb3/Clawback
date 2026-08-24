import type {
  ActionProposal,
  ApprovalRecord,
  CaseCategory,
  CaseState,
  ClawbackReceipt,
  ExecutionEvidence,
  OutcomeEvidence,
} from "@clawback/shared";
import type { EncryptedPayload } from "@clawback/privacy";
import type { SettlementRecord } from "@clawback/payments";

/**
 * The full internal record the CaseStore persists. Sensitive fields are
 * ALWAYS stored as EncryptedPayload, never as plaintext — see
 * packages/privacy's encryptAtRest/decryptAtRest, called only inside
 * Orchestrator at the moments the data-flow registry marks as
 * "attested_compute_only" (build prompt §5).
 */
export interface CaseRecord {
  readonly caseId: string;
  readonly ownerId: string;
  readonly category: CaseCategory;
  readonly state: CaseState;
  readonly encryptedInput: EncryptedPayload;
  readonly proposal: ActionProposal | null;
  readonly encryptedProposalMessage: EncryptedPayload | null;
  readonly approval: ApprovalRecord | null;
  readonly execution: ExecutionEvidence | null;
  readonly outcome: OutcomeEvidence | null;
  readonly receipt: ClawbackReceipt | null;
  readonly settlement: SettlementRecord | null;
  readonly environment: "sandbox" | "live";
  readonly degradedReason: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/** The public-safe view returned to a UI/API caller — never contains an
 *  EncryptedPayload or anything the data-flow registry marks non-public,
 *  beyond what the case owner is themselves allowed to see (the proposal
 *  text, which necessarily echoes back what they told Clawback). */
export interface CaseSummary {
  readonly caseId: string;
  readonly category: CaseCategory;
  readonly state: CaseState;
  readonly proposal: ActionProposal | null;
  readonly outcome: OutcomeEvidence | null;
  readonly receipt: ClawbackReceipt | null;
  readonly degradedReason: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export function toSummary(record: CaseRecord): CaseSummary {
  return {
    caseId: record.caseId,
    category: record.category,
    state: record.state,
    proposal: record.proposal,
    outcome: record.outcome,
    receipt: record.receipt,
    degradedReason: record.degradedReason,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}
